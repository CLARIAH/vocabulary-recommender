#!/usr/bin/env node
import fs, { mkdir } from "fs";

import path from "path";
import { assignElasticQuery, elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";
import { recommend, createBundleList, replaceAll } from "./recommend";
import { getVocabName, getPrefixes } from "./vocabNames";
import yargs from "yargs/yargs";
import _ from "lodash";
import {
  Arguments,
  ReturnObject,
  Endpoint,
  UsedEndpoints,
  Bundle,
  Conf,
  QueryFiles,
  Result,
} from "./interfaces";
import { homogeneousRecommendation } from "./homogeneous";

// Creates a configuration object if no configuration file is provided
function createDefaultConfiguration() {
  return {
    defaultEndpoint: "druid-recommend",
    defaultQueryClass: "./queries/defaultClass.rq",
    defaultQueryProperty: "./queries/defaultProperty.rq",
    endpoints: {
      "druid-recommend": {
        type: "elasticsearch",
        url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
      },
      nde: {
        type: "sparql",
        url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
        queryClass: "./queries/uiClass.rq",
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
  // const vocaDir = path.resolve("conf");
  const endpointConfigFile = path.resolve(
    // vocaDir,
    "conf.json"
  );
  const endpointConfigurationObject = createDefaultConfiguration();

  try {
    // if (!fs.existsSync(vocaDir)) {
    //   console.error(
    //     "'conf' folder not found in current working directory, creating folder..."
    //   );
    //   fs.mkdirSync(path.resolve(vocaDir));
    //   console.error(`Folder generated in: ${vocaDir}`);
    // }
    if (!fs.existsSync(endpointConfigFile)) {
      console.error(
        "Endpoint configuration file 'conf.json' is not found in the working directory, creating endpoint configuration file..."
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
    sparqlFiles.push(
      assignQueryFile(endpoints[end], defaultQueryClass, defaultQueryProp)
    );
  }

  const sparqlQueries: QueryFiles[] = [];
  for (const queryFile of sparqlFiles) {
    sparqlQueries.push({
      class: fs.readFileSync(path.resolve(queryFile.class), "utf8"),
      property: fs.readFileSync(path.resolve(queryFile.property), "utf8"),
    });
  }

  const defaultQueryFiles = assignQueryFile(
    endpoints[defaultEndpointName],
    defaultQueryClass,
    defaultQueryProp
  );

  if (defaultEndpointName === "") {
    throw new Error(
      `ERROR\n\nNo endpoint for defaultEndpoint provided in config file. Please add a defaultEndpoint from: ${endpointNamesFromConfig}`
    );
  } else if (defaultQueryClass === (undefined || "")) {
    throw new Error(
      `ERROR\n\nNo query for defaultQueryClass provided in config file. Please add a defaultQueryClass from: ${endpointNamesFromConfig}`
    );
  } else if (defaultQueryProp === (undefined || "")) {
    throw new Error(
      `ERROR\n\nNo query for defaultQueryProp provided in config file. Please add a defaultQueryProp from: ${endpointNamesFromConfig}`
    );
  }

  return {
    file: endpointConfigFile,
    defaultEndpoint: {
      name: defaultEndpointName,
      type: endpoints[defaultEndpointName].type,
      url: endpoints[defaultEndpointName].url,
      queryClass: fs.readFileSync(
        path.resolve(defaultQueryFiles.class),
        "utf8"
      ),
      queryProperty: fs.readFileSync(
        path.resolve(defaultQueryFiles.property),
        "utf8"
      ),
    },
    endpointNames: endpointNamesFromConfig,
    endpointTypes: endpointTypes,
    endpointUrls: endpointUrls,
    queries: sparqlQueries,
  };
}

function assignQueryFile(
  endpoint: Endpoint,
  defaultQueryClass: string,
  defaultQueryProp: string
): QueryFiles {
  let queryFile: QueryFiles = {
    class: "",
    property: "",
  };
  // Elasticsearch endpoint -> Do not assign SPARQL queries.
  if (endpoint.type === "search") {
    queryFile = { class: "", property: "" };
  } else {
    // SPARQL endpoint + class query and property query are defined
    if (
      endpoint.queryClass != undefined &&
      endpoint.queryProperty != undefined
    ) {
      queryFile = {
        class: endpoint.queryClass,
        property: endpoint.queryProperty,
      };
      // SPARQL endpoint + class query is defined
    } else if (
      endpoint.queryClass != undefined &&
      endpoint.queryProperty === undefined
    ) {
      queryFile = {
        class: endpoint.queryClass,
        property: defaultQueryProp,
      };
      // SPARQL endpoint + property query is defined
    } else if (
      endpoint.queryClass === undefined &&
      endpoint.queryProperty != undefined
    ) {
      queryFile = {
        class: defaultQueryClass,
        property: endpoint.queryProperty,
      };
      // SPARQL endpoint + neither class query or property query are defined
    } else if (
      endpoint.queryClass === undefined &&
      endpoint.queryProperty === undefined
    ) {
      queryFile = {
        class: defaultQueryClass,
        property: defaultQueryProp,
      };
    }
  }
  return queryFile;
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
    defaultEndpoint: {
      name: "",
      type: "",
      url: "",
      queryClass: "",
      queryProperty: "",
    },
  };
  const argv = await cli();

  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    input.searchTerms = argv.searchTerm.map((term: { toString: () => any }) =>
      term.toString()
    );
    if (argv.category) {
      //  Ensure all elements of array are strings
      input.categories = argv.category.map((term: { toString: () => any }) =>
        term.toString()
      );

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
                queryClass: conf.queries[confIX].class,
                queryProperty: conf.queries[confIX].property,
              });
              included = true;
            }
          }
          if (included === false) {
            throw Error(
              `ERROR\n\nThe given endpoint is not included in the configuration file conf.json! Please run yarn recommend -i to see which endpoints are available.`
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

  // configures the Input for the homogeneous recommendations.
  const input = await configureInput();

  /** recommend contains
   * the resultObj with the recommendations
   * the bundled search inputs
   */
  const recommended = await homogeneousRecommendation(input);

  // Jana: Find a better way to retrieve the information and pass es für hr an
  const bundles = await recommend(input);
  // Log the search inputs
  // for (const bundle of bundles.bundled) {
  //   // Log query if verbose level 2
  //   if (argv.verbose >= 2) {
  //     if (bundle.endpointType === "search") {
  //       console.error(
  //         JSON.stringify(assignElasticQuery(bundle.category, bundle.searchTerm))
  //       );
  //     } else {
  //       console.error(replaceAll(bundle.query, "\\${term}", bundle.searchTerm));
  //     }
  //   }

  //   if (argv.format === "text") {
  //     if (argv.verbose >= 1) {
  //       console.log(
  //         "--------------------------------------------------------------"
  //       );
  //       console.log(
  //         `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
  //       );
  //     }
  //   }
  // }

  let outputString: string = ``;
  // Log all the results
  if (argv.format === "text") {
    for (const index in recommended) {
      if (index === "0") {
        // Log results for the instance recommendations
        outputString += `\nThe following homogeneous recommendation prefers high individual scores:\n`;
      } else {
        // Log results for the vocabulary recommendations
        outputString += `\nThe following homogeneous recommendation prefers high vocabulary scores:\n`;
      }
      for (const searchObj of recommended[index]) {
        outputString += `\nsearchTerm: ${JSON.stringify(
          searchObj.searchTerm,
          null,
          "\t"
        )}\n\n`;
        const homogeneous = searchObj.homogeneous[0];
        outputString += `  iri: ${JSON.stringify(
          homogeneous.iri,
          null,
          "\t"
        )}\n`;
        outputString += `  label: ${JSON.stringify(
          homogeneous.label,
          null,
          "\t"
        )}\n`;
        outputString += `  description: ${JSON.stringify(
          homogeneous.description,
          null,
          "\t"
        )}\n`;
        outputString += `  score: ${JSON.stringify(
          homogeneous.score,
          null,
          "\t"
        )}\n`;
        outputString += `  vocabulary: ${JSON.stringify(
          homogeneous.vocabulary,
          null,
          "\t"
        )}\n`;
        outputString += `  category: ${JSON.stringify(
          homogeneous.category,
          null,
          "\t"
        )}\n`;
      }
      outputString += `\n--------------------------------------------------------------\n`;
    }

      outputString += `\n--------------------------------------------------------------\n`;
      outputString += `\nSingle recommendations:\n`;
      for (const searchObj of recommended[0]) {
        outputString += `\nsearchTerm: ${JSON.stringify(
          searchObj.searchTerm,
          null,
          "\t"
        )}\n\n`;
        const singles = searchObj.single ? searchObj.single : [];
        for (const single of singles) {
          outputString += `  iri: ${JSON.stringify(single.iri, null, "\t")}\n`;
          outputString += `  label: ${JSON.stringify(
            single.label,
            null,
            "\t"
          )}\n`;
          outputString += `  description: ${JSON.stringify(
            single.description,
            null,
            "\t"
          )}\n`;
          outputString += `  score: ${JSON.stringify(
            single.score,
            null,
            "\t"
          )}\n`;
          outputString += `  vocabulary: ${JSON.stringify(
            single.vocabulary,
            null,
            "\t"
          )}\n`;
          outputString += `  category: ${JSON.stringify(
            single.category,
            null,
            "\t"
          )}\n\n`;
        }
      
    }
    console.log(outputString);
  }

  // Log results for the homogeneous recommendation
  // if (argv.format === "text") {
  //   for (const searchObj of recommended) {
  //     let outputString: string = `\n${result.iri}\n`;
  //     for (const result of searchObj.homogeneous) {
  //       outputString += `\n${result.iri}\n`;
  //       if (!result.vocabulary) {
  //         outputString += `Vocabulary: ${result.iri}\n`;
  //       } else {
  //         outputString += `Vocabulary: ${result.vocabulary}\n`;
  //       }
  //       if (returnObj.endpoint.type === "search") {
  //         if (result.description) {
  //           outputString += `Description: ${result.description}\n`;
  //         }
  //       } else {
  // for (const row of returnObj.addInfo) {
  //   if (row["iri"] === result.iri) {
  //     for (const key of Object.keys(row)) {
  //       if (key != "iri" && row[key] != null) {
  //         outputString += `${key}: ${row[key]}\n`;
  //       }
  //     }
  //   }
  // }
  // }

  //     }
  //   }
  // }
  // if (argv.format == "json") {
  //   console.log(JSON.stringify(recommended.resultObj, null, "\t"));
  // }
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
