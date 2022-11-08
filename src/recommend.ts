#!/usr/bin/env node
import fs, { mkdir } from "fs";
import {
  Result,
  assignElasticQuery,
  elasticSuggestions,
} from "./elasticsearch";
import { assignSparqlQuery, sparqlSuggestions } from "./sparql";
import yargs from "yargs/yargs";
import _ from "lodash";

// input endpoints
let usedEndpointsType: string[] = [];
let usedEndpointsUrl: string[] = [];

// Turn endpoint config file into a list of endpoints and:
// concatenate with given CLI argv endpoints if they are not the default endpoints

const endpointConfigurationObject = {
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

var file = ".vocabulary-recommender.json";

if (
  !fs.existsSync(file) &&
  !fs.existsSync("~/Vocabulary_recommender/.vocabulary-recommender.json")
) {
  const configObject = JSON.stringify(endpointConfigurationObject);
  fs.mkdirSync("~/Vocabulary_recommender");
  fs.writeFileSync(
    "~/Vocabulary_recommender/.vocabulary-recommender.json",
    configObject
  );
  file = "~/Vocabulary_recommender/.vocabulary-recommender.json";
} else if (
  !fs.existsSync(file) &&
  fs.existsSync("~/Vocabulary_recommender/.vocabulary-recommender.json")
) {
  file = "~/Vocabulary_recommender/.vocabulary-recommender.json";
}

const confFile = fs.readFileSync(file, "utf8");
const jsonConfFile = JSON.parse(confFile);
const defaultEndpointName = jsonConfFile.defaultEndpoint;
const endpoints = jsonConfFile.endpoints;
const endpointNamesFromConfig = Object.keys(endpoints);
const endpointUrls: string[] = [];
const endpointTypes: string[] = [];
endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));

const sparqlFiles: string[] = [];
for (const i in endpointNamesFromConfig) {
  if (endpointTypes[i] === "sparql") {
    // endpoints[i].query contains the name of the file where the query is specified -> term is inserted later
    sparqlFiles.push("confSparql.rq");
  } else {
    sparqlFiles.push("");
  }
}

// Bundle interface used for corresponding searchTerm and category
interface Bundle {
  searchTerm: string;
  category: string;
  endpointType: "sparql" | "search";
  endpointUrl: string;
  queryFile: string;
}

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
    console.log(`The available endpoints are:\n${endpointNamesFromConfig}`);
    return;
  }

  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    const searchTerms: string[] = argv.searchTerm.map((term) =>
      term.toString()
    );
    if (argv.category) {
      //  Ensure all elements of array are strings
      const categories: string[] = argv.category.map((term) => term.toString());
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
            queryFile: sparqlFiles[ix],
          })
        );

        // Jana: Add query string
        const returnedObjects: {
          searchTerm: string;
          category: string;
          endpoint: string;
          results: Result[];
        }[] = []; // the final object containing all returnObjects

        // loop over each bundle (searchTerm, category) to find the results with the given endpoints
        for (const bundle of bundled) {
          let results: Result[] = [];

          // search for results
          if (bundle.endpointType === "search") {
            const elasticSuggested = await elasticSuggestions(
              bundle.category,
              bundle.searchTerm,
              bundle.endpointUrl
            );
            results = results.concat(elasticSuggested);

            // Log query if verbose level 2
            if (argv.verbose >= 2) {
              console.error(
                JSON.stringify(
                  assignElasticQuery(bundle.category, bundle.searchTerm)
                )
              );
            }
          } else if (bundle.endpointType === "sparql") {
            if (bundle.queryFile != "") {
              const queryWithoutTerm: string = fs.readFileSync(
                bundle.queryFile,
                "utf8"
              );
              const query = (term: string) => queryWithoutTerm;
              const sparqlSuggested = await sparqlSuggestions(
                bundle.category,
                bundle.searchTerm,
                bundle.endpointUrl,
                // Jana: Needs to be a string with the query and the search term
                query(bundle.searchTerm)
              );
              // adding the results for the current searchTerm and category for the current endpoint
              results = results.concat(sparqlSuggested);

              // Log query
              if (argv.verbose >= 2) {
                console.log(query(bundle.searchTerm));
              }
            } else {
              throw Error(
                "ERROR\n\nNo query has been specified."
              );
            }
          } else {
            throw new Error(`${bundle.endpointType}`);
          }

          // object containing the results of the current searchTerm and category for all searched endpoints
          // Jana: Add used query
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
                // Jana: Add query?
                `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
              );
            }

            for (const result of results) {
              if (result.description) {
                console.log(
                  `${result.iri}\nDescription: ${result.description}\n`
                );
              } else {
                console.log(`${result.iri}\n`);
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
