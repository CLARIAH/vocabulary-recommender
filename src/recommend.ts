#!/usr/bin/env node
import fs, { mkdir } from "fs";
import { homedir } from "os";
import path from "path";

import { assignElasticQuery, elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";
import { Output, Result, Bundle, QueryFiles } from "./interfaces";
import yargs from "yargs/yargs";
import _ from "lodash";

// These lists store the information about the endpoints that should be used to create the bundle
let usedEndpointsType: string[] = [];
let usedEndpointsUrl: string[] = [];
let usedQuery: QueryFiles[] = [];

// Turn endpoint config file into a list of endpoints and:
// concatenate with given CLI argv endpoints if they are not the default endpoints
export const endpointConfigurationObject = {
  defaultEndpoint: "druid-recommend",
  defaultQueryClass: "./queries/defaultClass.rq",
  defaultQueryProperty:"./queries/defaultProperty.rq",
  endpoints: {
    "druid-recommend": {
      type: "elasticsearch",
      url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
    },
    "nde": {
      type: "sparql",
      url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
      queryClass: "./queries/confSparql.rq"
    },
  },
};

const vocaDir = path.resolve( "vocabulary_recommender")
const endpointConfigFile = path.resolve(vocaDir, 'vocabulary-recommender.json')

try{
  if (!fs.existsSync(vocaDir)) {
    console.error("'vocabulary_recommender' folder not found in current working directory, creating folder...")
    fs.mkdirSync(path.resolve(vocaDir))
    console.error(`Folder generated in: ${vocaDir}`)
  } 
  if (!fs.existsSync(endpointConfigFile)) {
    console.error("Endpoint configuration file 'vocabulary-recommender.json' is not found in the '/vocabulary_recommender' folder, creating endpoint configuration file...")
    const configObject = JSON.stringify(endpointConfigurationObject, null, '\t') 
    fs.writeFileSync(endpointConfigFile, configObject)
    console.error(`File generated in: ${endpointConfigFile}\n`)
  }
} catch(err){
  console.error(err)
}

// Read content of the configuration file.
const confFile = fs.readFileSync(endpointConfigFile, "utf8");
// Store the configured endpoints in a json object.
const jsonConfFile = JSON.parse(confFile);
// Store the information in the json object in different variables to reuse it later.
const defaultEndpointName = jsonConfFile.defaultEndpoint;
const defaultQueryClass = jsonConfFile.defaultQueryClass;
const defaultQueryProp = jsonConfFile.defaultQueryProperty;
const endpoints = jsonConfFile.endpoints;
const endpointNamesFromConfig = Object.keys(endpoints);
const endpointUrls: string[] = [];
const endpointTypes: string[] = [];
endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));

// List containing the names of the files where the configured and default queries are stored.
const sparqlFiles: QueryFiles[] = [];
for (const end of endpointNamesFromConfig) {
  // Elasticsearch endpoint -> Do not assign SPARQL queries.
  if (endpoints[end].type === "search") {
    sparqlFiles.push({ class: "", property: "" });
  } else {
    // SPARQL endpoint + class query and property query are defined
    if (
      endpoints[end].queryClass != undefined &&
      endpoints[end].queryProperty != undefined
    ) {
      sparqlFiles.push({
        class: endpoints[end].queryClass,
        property: endpoints[end].queryProperty,
      });
      // SPARQL endpoint + class query is defined
    } else if (
      endpoints[end].queryClass != undefined &&
      endpoints[end].queryProperty === undefined
    ) {
      sparqlFiles.push({
        class: endpoints[end].queryClass,
        property: defaultQueryProp,
      });
      // SPARQL endpoint + property query is defined
    } else if (
      endpoints[end].queryClass === undefined &&
      endpoints[end].queryProperty != undefined
    ) {
      sparqlFiles.push({
        class: defaultQueryClass,
        property: endpoints[end].queryProperty,
      });
      // SPARQL endpoint + neither class query or property query are defined
    } else if (
      endpoints[end].queryClass === undefined &&
      endpoints[end].queryProperty === undefined
    ) {
      sparqlFiles.push({
        class: defaultQueryClass,
        property: defaultQueryProp,
      });
    }
  }
}

// Check if defaultEndpoint is defined.
if (defaultEndpointName === "") {
  throw new Error(
    `ERROR\n\nNo endpoint for defaultEndpoint provided in config file. Please add a defaultEndpoint from: ${endpointNamesFromConfig}`
  );
} else if (defaultQueryClass === ( undefined || "" )) {
  throw new Error(
    `ERROR\n\nNo query for defaultQueryClass provided in config file. Please add a defaultQueryClass from: ${endpointNamesFromConfig}`
  );
} else if (defaultQueryProp === ( undefined || "" )) {
  throw new Error(
    `ERROR\n\nNo query for defaultQueryProp provided in config file. Please add a defaultQueryProp from: ${endpointNamesFromConfig}`
  );
}

// Run and log results function
async function run() {
  // CLI | Waiting for arguments
  const argv = await yargs(process.argv.slice(2)).options({
    searchTerm: {
      alias: "t",
      type: "array",
      describe: "Search term used for querying vocabularies",
    },
    category: {
      alias: "c",
      type: "array",
      describe: "Category of IRI, returns either classes or properties",
      choices: ["class", "property"],
    },
    endpoint: {
      alias: "e",
      type: "array",
      default: [],
      describe: `Provide endpoint from the available endpoints: ${endpointNamesFromConfig}\nThese endpoints can be changed in the './'`,
    },
    format: {
      alias: "f",
      type: "string",
      default: "text",
      describe: "Choose output format of the results",
      choices: ["text", "json"],
    },
    verbose: {
      alias: "v",
      count: true,
      describe:
        'Show additional information about search query, increasing the number of v\'s will increase the talkativeness.\nLevel 1 ("-v"): input arguments \nLevel 2 ("-vv"): Elasticsearch/Sparql object search query',
    },
    endpoints: {
      alias: "i",
      count: true,
      describe: "Displays all available endpoint names and location of the configuration file",
    },
    help: {
      alias: "h",
    },
  }).argv;

  // Log information about the configured endpoints.
  if (argv.endpoints > 0) {
    console.log(`Endpoint configuration file: ${endpointConfigFile}\n\nThe default endpoint is: \x1b[33m${defaultEndpointName}\x1b[0m. 
    \nThe available endpoints and their types are:\n`)
    for (let index in endpointNamesFromConfig){
      console.log(`Key Name: \x1b[36m${endpointNamesFromConfig[index]}\x1b[0m\n  -Type: ${endpointTypes[index]}\n  -URL: ${endpointUrls[index]}\n`)
    }
    return 
  }

  // sparqlSuggested has global scope because it is needed to display the results correctly.
  var sparqlSuggested: any;
  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    const searchTerms: string[] = argv.searchTerm.map((term) =>
      term.toString()
    ) 
    if (argv.category) {
      //  Ensure all elements of array are strings
      const categories: string[] = argv.category.map((term) => term.toString());
      // check if searchterms and categories contain the same amount of arguments.
      if (searchTerms.length === categories.length) {
        // if no endpoints were provided, use the default for each search term
        if (argv.endpoint.length === 0) {
          console.error(
            `(!) No endpoints were provided, using the default endpoint: ${defaultEndpointName} (!)`
          );
          for (const i in argv.searchTerm) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            // Assign the information of the defaultEndpoint that should be used later to search in the vocabularies.
            usedEndpointsType.push(endpointTypes[indexNum]);
            usedEndpointsUrl.push(endpointUrls[indexNum]);
            usedQuery.push({
              class: defaultQueryClass,
              property: defaultQueryProp,
            });
          }
        }
        // if endpoints were provided
        else {
          for (const i in argv.endpoint) {
            // when endpoints names were provided and exist in config file
            if (endpointNamesFromConfig.includes(argv.endpoint[i])) {
              let indexNum = endpointNamesFromConfig.indexOf(argv.endpoint[i]);
              // Assign the information of the configured endpoint that should be used later to search in the vocabularies.
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
              usedQuery.push(sparqlFiles[indexNum]);
            }
            // when endpoint name was provided but does not exist in config file
            else {
              console.error(
                `"${argv.endpoint[i]}" is not found in the available endpoint config file. The default "${defaultEndpointName}" was used instead.\nAvailable endpoint names: ${endpointNamesFromConfig}.\n`
              );
              let indexNum =
                endpointNamesFromConfig.indexOf(defaultEndpointName);
              // Assign the information of the defaultEndpoint that should be used later to search in the vocabularies.
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
              usedQuery.push({
                class: defaultQueryClass,
                property: defaultQueryProp,
              });
            }
          }
        }
        // if not enough endpoints are provided, append default until there are enough
        if (
          argv.endpoint.length > 0 &&
          argv.endpoint.length !== argv.searchTerm.length
        ) {
          if (argv.endpoint.length > argv.searchTerm.length) {
            throw Error(
              "ERROR\n\nThere were more endpoints provided than search terms in the input, please provide the same number of endpoints as search terms"
            ) 
          }
          console.error(
            `Number of given search terms (${argv.searchTerm?.length}) and endpoints (${argv.endpoint.length}) don\'t match\n\nDefault endpoints were added to match the amount of arguments.`
          ) 
          while (usedEndpointsUrl.length !== argv.searchTerm?.length) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            // Assign the information of the defaultEndpoint that should be used later to search in the vocabularies.
            usedEndpointsUrl.push(endpointUrls[indexNum]);
            usedEndpointsType.push(endpointTypes[indexNum]);
            usedQuery.push({
              class: defaultQueryClass,
              property: defaultQueryProp,
            });
          }
        }

        // Make a list of Bundles that concatenates all the information needed for searching.
        function makeBundle(
          searchTerms: string[],
          categories: string[],
          usedEndpointsType: string[],
          usedEndpointsUrl: string[],
          usedQuery: QueryFiles[]
        ) {
          const bundled: Bundle[] = [];
          for (const i in searchTerms) {
            // Assign the correct query given the category.
            if (categories[i] === "class") {
              var query = usedQuery[i].class;
            } else {
              var query = usedQuery[i].property;
            }
            // Make the bundle.
            bundled.push({
              searchTerm: searchTerms[i],
              category: categories[i],
              endpointType:
                usedEndpointsType[i] === "sparql" ? "sparql" : "search", // guard
              endpointUrl: usedEndpointsUrl[i],
              queryFile: query,
            });
          }
          return bundled;
        }
        const bundled: Bundle[] = makeBundle(
          searchTerms,
          categories,
          usedEndpointsType,
          usedEndpointsUrl,
          usedQuery
        );

        // the final object containing all returnObjects
        const returnedObjects: {
          searchTerm: string;
          category: string;
          endpoint: string;
          results: Result[];
        }[] = [];

        // loop over each bundle to find the results with the given endpoints
        for (const bundle of bundled) {
          // The output maps the result to the endpoint type to correctly log the results. (SPARQL gives back more results than Elasticsearch)
          let outputs: Output[] = [];
          let results: Result[] = [];

          // search for results
          if (bundle.endpointType === "search") {
            const elasticSuggested = await elasticSuggestions(
              bundle.category,
              bundle.searchTerm,
              bundle.endpointUrl
            );
            results = results.concat(elasticSuggested);
            outputs = outputs.concat({
              result: elasticSuggested,
              endpointType: "search",
            });

            // Log query if verbose level 2
            if (argv.verbose >= 2) {
              console.error(
                JSON.stringify(
                  assignElasticQuery(bundle.category, bundle.searchTerm)
                )
              ) 
            }
          } else if (bundle.endpointType === "sparql") {
            // Read the file containing the default or configured SPARQL query.
            const queryWithoutTerm: string = fs.readFileSync(
              bundle.queryFile,
              "utf8"
            );
            // Fill the searchTerm into the querystring
            const query: string = replaceAll(
              queryWithoutTerm,
              "\\${term}",
              bundle.searchTerm
            );
            // search with the query
            sparqlSuggested = await sparqlSuggestions(
              bundle.category,
              bundle.searchTerm,
              bundle.endpointUrl,
              query
            );
            // adding the results for the current searchTerm and category for the current endpoint
            results = results.concat(sparqlSuggested[0]);
            outputs = outputs.concat({
              result: sparqlSuggested[0],
              endpointType: "sparql",
            });

            // Log query
            if (argv.verbose >= 2) {
              console.log(query);
            }
          } else {
            throw new Error(`${bundle.endpointType}`) 
          }

          // object containing the results of the current searchTerm and category for all searched endpoints
          const returnObject: {
            searchTerm: string 
            category: string 
            endpoint: string 
            results: Result[] 
          } = {
            searchTerm: bundle.searchTerm,
            category: bundle.category,
            endpoint: bundle.endpointUrl,
            results,
          } 
          returnedObjects.push(returnObject) 

          // Log results
          if (argv.format === "text") {
            if (argv.verbose >= 1) {
              console.log(
                "--------------------------------------------------------------"
              ) 
              console.log(
                `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
              ) 
            }

            // Concatenate the output string
            for (const output of outputs) {
              for (const outResult of output.result) {
                let outputString: string = `\n${outResult.iri}\n`;

                // Concatenate the output for Elasticsearch queries
                if (output.endpointType === "search") {
                  if (outResult.description) {
                    outputString += `Description: ${outResult.description}\n`;
                  }
                } else {
                  // Concatenate the output for configured or default SPARQL queries
                  for (const row of sparqlSuggested[1]) {
                    if (row["iri"] === outResult.iri) {
                      for (const key of Object.keys(row)) {
                        if (key != "iri" && row[key] != null) {
                          outputString += `${key}: ${row[key]}\n`;
                        }
                      }
                    }
                  }
                }
                console.log(outputString);
              }
            }
          }
          if (argv.format == "json") {
            console.log(JSON.stringify(returnedObjects, null, "\t")) 
          }
        }
      } else {
        throw Error(
          `ERROR\n\nInput array length for searchTerm (${argv.searchTerm.length}) and category (${argv.category.length}) is not identical, please provide inputs with the same amount of arguments.`
        ) 
      }
    } else {
      throw Error(
        'ERROR\n\nNo categories were provided as input argument, please provide a category with: "-c <category>".\nAn example input argument: "-t person -c class"\nUse "-h" or "--help" for more information.'
      ) 
    }
  } else {
    throw Error(
      'ERROR\n\nNo search terms were provided as input argument, please provide a search term with: "-t <search term>".\nAn example input argument: "-t person -c class"\nUse "-h" or "--help" for more information.'
    ) 
  }
}

// Start recommender
run().catch((e) => {
  console.error(e.message) 
  process.exit(1) 
}) 
process.on("uncaughtException", function (err) {
  console.error("Uncaught exception", err) 
  process.exit(1) 
}) 
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});

// Help function to fill in the searchterm in the SPARQL queries.
function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}
