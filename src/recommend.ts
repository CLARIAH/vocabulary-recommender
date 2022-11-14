#!/usr/bin/env node
import fs, { mkdir } from "fs";
import { homedir } from "os";
import path from "path";

import {
  assignElasticQuery,
  elasticSuggestions,
} from "./elasticsearch";
import { assignSparqlQuery, sparqlSuggestions } from "./sparql";
import { Output, Result, Bundle } from "./interfaces";
import yargs from "yargs/yargs";
import _ from "lodash";

// input endpoints
let usedEndpointsType: string[] = [];
let usedEndpointsUrl: string[] = [];
let usedQuery: string[] = [];

// Turn endpoint config file into a list of endpoints and:
// concatenate with given CLI argv endpoints if they are not the default endpoints

export const endpointConfigurationObject = {
  defaultEndpoint: "druid-recommend",
  endpoints: {
    "druid-recommend": {
      type: "elasticsearch",
      url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
    },
    nde: {
      type: "sparql",
      url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
      query: "SparqlDefault.rq",
    },
  },
};
const userHomeDir = homedir()
const vocaDir = path.resolve(userHomeDir, "vocabulary_recommender")
const endpointConfigFile = path.resolve(vocaDir, 'vocabulary-recommender.json')

try{
  if (!fs.existsSync(vocaDir)) {
    console.error("'vocabulary_recommender' folder not found in home directory, creating folder...")
    fs.mkdirSync(path.resolve(vocaDir))
    console.error(`Folder generated in: ${vocaDir}`)
  } 
  if (!fs.existsSync(endpointConfigFile)) {
    console.error("Endpoint configuration file 'vocabulary-recommender.json' is not found in the '~/vocabulary_recommender' folder, creating endpoint configuration file...")
    const configObject = JSON.stringify(endpointConfigurationObject) 
    fs.writeFileSync(endpointConfigFile, configObject)
    console.error(`File generated in: ${endpointConfigFile}`)
  }
} catch(err){
  console.error(err)
}

const confFile = fs.readFileSync(endpointConfigFile, "utf8") 
const jsonConfFile = JSON.parse(confFile);
const defaultEndpointName = jsonConfFile.defaultEndpoint;
const defaultQueryClass = jsonConfFile.defaultQueryClass;
const defaultQueryProp = jsonConfFile.defaultQueryProperty;
const endpoints = jsonConfFile.endpoints;
const endpointNamesFromConfig = Object.keys(endpoints);
const endpointUrls: string[] = [];
const endpointTypes: string[] = [];
// List containing the names of the files where the configured queries are stored.
const sparqlFiles: string[] = [];
endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));
// Make a decision between queryClass and queryProperty
endpointNamesFromConfig.forEach((i) => sparqlFiles.push(defaultQueryClass));

if (defaultEndpointName === "") {
  throw new Error(
    `ERROR\n\nNo endpoint for defaultEndpoint provided in config file. Please add a defaultEndpoint from: ${endpointNamesFromConfig}`
  );
}

// Run and log results function
async function run() {
  // Waiting for arguments
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
      describe: "Displays all available endpoint names",
    },
    help: {
      alias: "h",
    },
  }).argv;

  if (argv.endpoints > 0) {
    console.log(`The default endpoint is: \x1b[33m${defaultEndpointName}\x1b[0m. 
    \nThe available endpoints and their types are:\n`)
    for (let index in endpointNamesFromConfig){
      console.log(`Key Name: \x1b[36m${endpointNamesFromConfig[index]}\x1b[0m\n  -Type: ${endpointTypes[index]}\n  -URL: ${endpointUrls[index]}\n`)
    }
    return 
  }
  
  // sparqlSuggested has global scope because it is needed to display the results correctly.
  var sparqlSuggested: any
  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    const searchTerms: string[] = argv.searchTerm.map((term) =>
      term.toString()
    );
    if (argv.category) {
      //  Ensure all elements of array are strings
      const categories: string[] = argv.category.map((term) => term.toString());
      console.log(`test: ${categories}`)
      // check if searchterms and categories are same number
      if (searchTerms.length === categories.length) {
        // if no endpoints were provided, use the default for each search term
        if (argv.endpoint.length === 0) {
          console.error(
            `(!) No endpoints were provided, using the default endpoint: ${defaultEndpointName} (!)`
          );
          for (const i in argv.searchTerm) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            usedEndpointsType.push(endpointTypes[indexNum]);
            usedEndpointsUrl.push(endpointUrls[indexNum]);
            usedQuery.push(sparqlFiles[indexNum]);
          }
        }
        // if endpoints were provided but don't match the number of searchTerms
        // Jana: Warum muss die Anzahl der searchTerms mit der Anzahl der Endpoints übereinstimmen?
        else {
          for (const i in argv.endpoint) {
            // when endpoints names were provided and exist in config file
            if (endpointNamesFromConfig.includes(argv.endpoint[i])) {
              let indexNum = endpointNamesFromConfig.indexOf(argv.endpoint[i]);
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
              usedQuery.push(sparqlFiles[indexNum]);
            }
            // when endpoint name was provided but does not exist in config file
            else {
              console.error(
                `"${argv.endpoint[i]}" is not found in the availble endpoint config file. The default "${defaultEndpointName}" was used instead.\nAvailable endpoint names: ${endpointNamesFromConfig}.\n`
              );
              let indexNum =
                endpointNamesFromConfig.indexOf(defaultEndpointName);
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
              usedQuery.push(sparqlFiles[indexNum]);
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
            );
          }
          console.error(
            `Number of given search terms (${argv.searchTerm?.length}) and endpoints (${argv.endpoint.length}) don\'t match\n\nDefault endpoints were added to match the amount of arguments.`
          );
          while (usedEndpointsUrl.length !== argv.searchTerm?.length) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            usedEndpointsUrl.push(endpointUrls[indexNum]);
            usedEndpointsType.push(endpointTypes[indexNum]);
            usedQuery.push(sparqlFiles[indexNum]);
          }
        }

        // zip the two arrays into a nested array with the same index ([a,b,c], [d,e,f] --> [[a,d],[b,e],[c,f]])

        // const zipped: [string | undefined, string | undefined, string | undefined][] = _.zip(searchTerms, categories, usedEndpoints)
        const bundled: Bundle[] = [];
        searchTerms.forEach((value, ix) =>
          bundled.push({
            searchTerm: value,
            category: categories[ix],
            endpointType:
              usedEndpointsType[ix] === "sparql" ? "sparql" : "search", // guard
            endpointUrl: usedEndpointsUrl[ix],
            queryFile: usedQuery[ix],
          })
        );

        const returnedObjects: {
          searchTerm: string;
          category: string;
          endpoint: string;
          results: Result[];
        }[] = []; // the final object containing all returnObjects

        // loop over each bundle (searchTerm, category) to find the results with the given endpoints
        for (const bundle of bundled) {
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
            outputs = outputs.concat({result: elasticSuggested, endpointType: "search"})

            // Log query if verbose level 2
            if (argv.verbose >= 2) {
              console.error(
                JSON.stringify(
                  assignElasticQuery(bundle.category, bundle.searchTerm)
                )
              );
            }
          } else if (bundle.endpointType === "sparql") {
            if (bundle.queryFile != undefined) {
              const queryWithoutTerm: string = fs.readFileSync(
                bundle.queryFile,
                "utf8"
              );
              const query: string = replaceAll(queryWithoutTerm, "\\${term}", bundle.searchTerm);
              sparqlSuggested = await sparqlSuggestions(
                bundle.category,
                bundle.searchTerm,
                bundle.endpointUrl,
                // Jana: Needs to be a string with the query and the search term
                query
              );
              // adding the results for the current searchTerm and category for the current endpoint
              results = results.concat(sparqlSuggested[0]);
              outputs = outputs.concat({result: sparqlSuggested[0], endpointType: "sparql"})

              // Log query
              if (argv.verbose >= 2) {
                console.log(query);
              }
            } else {
              console.error(
                //Jana: Make decision between class and property
                `(!) No SPARQL query has been provided, using the default query: ${defaultQueryClass} (!)`
                );
                const queryWithoutTerm: string = fs.readFileSync(
                  //Jana: Make decision between class and property
                  defaultQueryClass,
                  "utf8"
                );
                const query: string = replaceAll(queryWithoutTerm, "\\${term}", bundle.searchTerm);
                sparqlSuggested = await sparqlSuggestions(
                  bundle.category,
                  bundle.searchTerm,
                  bundle.endpointUrl,
                  // Jana: Needs to be a string with the query and the search term
                  query
                );
                // adding the results for the current searchTerm and category for the current endpoint
                results = results.concat(sparqlSuggested[0]);
                outputs = outputs.concat({result: sparqlSuggested[0], endpointType: "sparql"})

                // Log query
                if (argv.verbose >= 2) {
                  console.log(query);
                }
            }
          } else {
            throw new Error(`${bundle.endpointType}`);
          }

          // object containing the results of the current searchTerm and category for all searched endpoints
          const returnObject: {
            searchTerm: string;
            category: string;
            endpoint: string;
            results: Result[];
          } = {
            searchTerm: bundle.searchTerm,
            category: bundle.category,
            endpoint: bundle.endpointUrl,
            results,
          };
          returnedObjects.push(returnObject);

          if (argv.format === "text") {
            if (argv.verbose >= 1) {
              console.log(
                "--------------------------------------------------------------"
              );
              console.log(
                `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
              );
            }

            // Concatenate the output string
            for (const output of outputs){
              for (const outResult of output.result) {
                let outputString: string = `\n${outResult.iri}\n`

                // Concatenate the output for Elasticsearch queries
                if (output.endpointType === 'search'){
                  if (outResult.description) {
                    outputString += `Description: ${outResult.description}\n`
                  }
                } else {
                  // Concatenate the output for configured SPARQL queries
                  for (const row of sparqlSuggested[1]){
                    if (row['iri'] === outResult.iri) {
                      for (const key of Object.keys(row)) {
                        if (key != 'iri' && row[key] != null) {
                          outputString += `${key}: ${row[key]}\n`
                        }
                      }
                    }
                  }
                }
                console.log(outputString)
              }
            }



          }
          if (argv.format == "json") {
            console.log(JSON.stringify(returnedObjects, null, "\t"));
          }
        }
      } else {
        throw Error(
          `ERROR\n\nInput array length for searchTerm (${argv.searchTerm.length}) and category (${argv.category.length}) is not identical, please provide inputs with the same amount of arguments.`
        );
      }
    } else {
      throw Error(
        'ERROR\n\nNo categories were provided as input argument, please provide a category with: "-c <category>".\nUse "-h" or "--help" for more information.'
      );
    }
  } else {
    throw Error(
      'ERROR\n\nNo search terms were provided as input argument, please provide a search term with: "-t <search term>".\nUse "-h" or "--help" for more information.'
    );
  }
}

// Start recommender
run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
process.on("uncaughtException", function (err) {
  console.error("Uncaught exception", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});

function replaceAll(str: string, find: string, replace: string) {
	return str.replace(new RegExp(find, 'g'), replace);
}

