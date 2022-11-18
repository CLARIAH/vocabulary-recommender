#!/usr/bin/env node
import fs, { mkdir } from "fs";

import path from "path";
import { assignElasticQuery, elasticSuggestions } from "./elasticsearch";
import { assignSparqlQuery, sparqlSuggestions } from "./sparql";
import { recommend, createBundleList } from "./recommend";
import yargs from "yargs/yargs";
import _ from "lodash";
import {
  Arguments,
  ReturnObject,
  Endpoint,
  EndpointLists,
  Bundle,
  Result,
  Conf,
} from "./interfaces";

// Creates a configuration object if no configuration file is provided
function createDefaultConfiguration() {
  return {
    defaultEndpoint: "druid-recommend",
    endpoints: {
      "druid-recommend": {
        type: "elasticsearch",
        url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
      },
      nde: {
        type: "sparql",
        url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
      },
    },
  };
}

/** Gets the information from the configuration file (or creates a new file with the configuration object)
Output: 
  file: string,
  defaultEndpoint: Endpoint,
  endpointNames: string[],
  endpointTypes: string[],
  endpointUrls: string[]
*/
function getConfiguration(): Conf {
  const vocaDir = path.resolve("vocabulary_recommender");
  const endpointConfigFile = path.resolve(
    vocaDir,
    "vocabulary-recommender.json"
  );
  const endpointConfigurationObject = createDefaultConfiguration();

  try {
    if (!fs.existsSync(vocaDir)) {
      console.error(
        "'vocabulary_recommender' folder not found in current working directory, creating folder..."
      );
      fs.mkdirSync(path.resolve(vocaDir));
      console.error(`Folder generated in: ${vocaDir}`);
    }
    if (!fs.existsSync(endpointConfigFile)) {
      console.error(
        "Endpoint configuration file 'vocabulary-recommender.json' is not found in the '/vocabulary_recommender' folder, creating endpoint configuration file..."
      );
      const configObject = JSON.stringify(
        endpointConfigurationObject,
        null,
        "\t"
      );
      fs.writeFileSync(endpointConfigFile, configObject);
      console.error(`File generated in: ${endpointConfigFile}\n`);
    }
  } catch (err) {
    console.error(err);
  }

  const confFile = fs.readFileSync(endpointConfigFile, "utf8");
  const jsonConfFile = JSON.parse(confFile);
  const defaultEndpointName = jsonConfFile.defaultEndpoint;
  const endpoints = jsonConfFile.endpoints;
  const endpointNamesFromConfig = Object.keys(endpoints);
  const endpointUrls: string[] = [];
  const endpointTypes: string[] = [];
  endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
  endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));

  if (defaultEndpointName === "") {
    throw new Error(
      `ERROR\n\nNo endpoint for defaultEndpoint provided in config file. Please add a defaultEndpoint from: ${endpointNamesFromConfig}`
    );
  }

  return {
    file: endpointConfigFile,
    defaultEndpoint: {
      name: defaultEndpointName,
      type: defaultEndpointName.type,
      url: defaultEndpointName.url,
    },
    endpointNames: endpointNamesFromConfig,
    endpointTypes: endpointTypes,
    endpointUrls: endpointUrls,
  };
}

// Returns the cli arguments
async function cli() {
  // Specifies which endpoints can be used for the search 
  const endpointNamesFromConfig = getConfiguration().endpointNames;

  return await yargs(process.argv.slice(2)).options({
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
      describe:
        "Displays all available endpoint names and location of the configuration file",
    },
    help: {
      alias: "h",
    },
  }).argv;
}

// Creates the input for the recommend() function
async function configureInput() {
  const input: Arguments = {
    searchTerms: [],
    categories: [],
    endpoints: [],
    defaultEndpoint: { name: "", type: "", url: "" },
  };
  const argv = await cli();

  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    input.searchTerms = argv.searchTerm.map((term) => term.toString());
    if (argv.category) {
      //  Ensure all elements of array are strings
      input.categories = argv.category.map((term) => term.toString());

      const conf: Conf = getConfiguration();
      if (argv.endpoint) {
        // Check if given endpoint is included in the configuration file
        for (const i in argv.endpoint) {
          let included: Boolean = false;
          for (const confIX in conf.endpointNames) {
            if (conf.endpointNames[confIX] === argv.endpoint[i]) {
              // Add the endpoint to the input
              input.endpoints.push({
                name: conf.endpointNames[confIX],
                type: conf.endpointTypes[confIX],
                url: conf.endpointUrls[confIX],
              });
              included = true;
            }
          }
          if (included === false) {
            throw Error(
              `ERROR\n\nThe given endpoint is not included in the configuration file /home/jana/triply/CLARIAH/vocabulary-recommender/vocabulary_recommender/vocabulary-recommender.json! Please run yarn recommend -i to see which endpoints are available.`
            );
          }
        }
      }
      input.defaultEndpoint = conf.defaultEndpoint;
    }
  }
  return input;
}

// Logs the results
async function run() {
  // Get the arguments from the command line
  const argv = await cli();
  const conf = getConfiguration();

  if (argv.endpoints > 0) {
    console.log(`Endpoint configuration file: ${conf.file}\n\nThe default endpoint is: \x1b[33m${conf.defaultEndpoint.name}\x1b[0m. 
    \nThe available endpoints and their types are:\n`);
    for (let index in conf.endpointNames) {
      console.log(
        `Key Name: \x1b[36m${conf.endpointNames[index]}\x1b[0m\n  -Type: ${conf.endpointTypes[index]}\n  -URL: ${conf.endpointUrls[index]}\n`
      );
    }
  }

  const input = await configureInput();
  /** recommend contains 
   * the resultObj with the recommendations
   * the bundled search inputs
  */ 
  const recommended = await recommend(input);
  // Log the search inputs
  for (const bundle of recommended.bundled) {
    // Log query if verbose level 2
    if (argv.verbose >= 2) {
      if (bundle.endpointType === "search") {
        console.error(
          JSON.stringify(assignElasticQuery(bundle.category, bundle.searchTerm))
        );
      } else {
        console.error(
          JSON.stringify(assignSparqlQuery(bundle.category)(bundle.searchTerm))
        );
      }
    }

    if (argv.format === "text") {
      if (argv.verbose >= 1) {
        console.log(
          "--------------------------------------------------------------"
        );
        console.log(
          `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
        );
      }
    }
  }

  // Log results
  if (argv.format === "text") {
    for (const returnObj of recommended.resultObj) {
      for (const result of returnObj.results) {
        if (result.description) {
          console.log(`${result.iri}\nDescription: ${result.description}\n`);
        } else {
          console.log(`${result.iri}\n`);
        }
      }
    }
  }
  if (argv.format == "json") {
    console.log(JSON.stringify(recommended.resultObj, null, "\t"));
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
