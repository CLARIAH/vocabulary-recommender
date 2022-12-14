#!/usr/bin/env node
import fs, { mkdir } from "fs";

import path from "path";
import { replaceAll } from "./singleRecommend";
import yargs from "yargs/yargs";
import _ from "lodash";
import { Endpoint, Conf, QueryFiles, Input } from "./interfaces";
import { homogeneousRecommendation } from "./homogeneous";

/** Gets the information from the configuration file (or creates a new file with the configuration object)
 * @returns a configuration object
*/
function getConfiguration(): Conf {
  // Load the configuration file.
  const configFile = path.resolve(
    "conf.json"
  );
  // Get the default if there is no configuration file.
  const defaultConfigurationObject = {
    defaultEndpoint: "druid-recommend",
    defaultQueryClass: "./queries/defaultClass.rq",
    defaultQueryProperty: "./queries/defaultProperty.rq",
    defaultQueryESClass: "./queries/defaultESClass.json",
    defaultQueryESProperty: "./queries/defaultESProp.json",
    endpoints: {
      "druid-recommend": {
        type: "search",
        url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
        queryClass: "queries/defaultESClass.json",
        queryProperty: "queries/defaultESProp.json"
      },
      nde: {
        type: "sparql",
        url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
        queryClass: "queries/defaultClass.rq",
        queryProperty: "queries/defaultProperty.rq"
      },
    },
  }

  try {
    if (!fs.existsSync(configFile)) {
      console.error(
        "Endpoint configuration file 'conf.json' is not found in the working directory, creating endpoint configuration file..."
      );
      const configObject = JSON.stringify(
        defaultConfigurationObject,
        null,
        "\t"
      );
      fs.writeFileSync(configFile, configObject);
      console.error(`File generated in: ${configFile}\n`);
    }
  } catch (err) {
    console.error(err);
  }

  // Store the information from the configuration file.
  const confFile = fs.readFileSync(configFile, "utf8");
  const jsonConfFile = JSON.parse(confFile);
  const defaultEndpointName = jsonConfFile.defaultEndpoint;
  const defaultQueryClass = jsonConfFile.defaultQueryClass;
  const defaultQueryProp = jsonConfFile.defaultQueryProperty;
  const defaultQueryESClass = jsonConfFile.defaultQueryESClass;
  const defaultQueryESProp = jsonConfFile.defaultQueryESProperty;
  const endpoints = jsonConfFile.endpoints;
  const endpointNamesFromConfig = Object.keys(endpoints);
  const endpointUrls: string[] = [];
  const endpointTypes: string[] = [];
  endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
  endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));

  // List containing the names of the files where the configured and default queries are stored.
  const queryFiles: QueryFiles[] = [];
  for (const end of endpointNamesFromConfig) {
    queryFiles.push(
      assignQueryFile(
        endpoints[end],
        defaultQueryClass,
        defaultQueryProp,
        defaultQueryESClass,
        defaultQueryESProp
      )
    );
  }

  // Extract the query string from the query file.
  const queryStrings: QueryFiles[] = [];
  for (const queryFile of queryFiles) {
    queryStrings.push({
      class: fs.readFileSync(path.resolve(queryFile.class), "utf8"),
      property: fs.readFileSync(path.resolve(queryFile.property), "utf8"),
    });
  }

  const defaultQueryFiles = assignQueryFile(
    endpoints[defaultEndpointName],
    defaultQueryClass,
    defaultQueryProp,
    defaultQueryESClass,
    defaultQueryESProp
  );

  // Throw errors when default declarations are missing.
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
  } else if (defaultQueryESClass === (undefined || "")) {
    throw new Error(
      `ERROR\n\nNo query for defaultQueryESClass provided in config file. Please add a defaultQueryESClass from: ${endpointNamesFromConfig}`
    );
  } else if (defaultQueryESProp === (undefined || "")) {
    throw new Error(
      `ERROR\n\nNo query for defaultQueryESProp provided in config file. Please add a defaultQueryESProp from: ${endpointNamesFromConfig}`
    );
  }

  // Return the configuration object.
  return {
    file: configFile,
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
    queries: queryStrings,
  };
}

/** Function that assigns the query files according to the endpoint type and the configured queries. 
 * 
 * @param endpoint the endpoint for which the query files should be specified.
 * @param defaultQueryClass default SPARQL query for classes.
 * @param defaultQueryProp default SPARQL query for properties.
 * @param defaultQueryESClass default Elasticsearch query for classes.
 * @param defaultQueryESProp default Elasticsearch query for properties.
 * 
 * @returns the query files for the given endpoint
 * */ 
function assignQueryFile(
  endpoint: Endpoint,
  defaultQueryClass: string,
  defaultQueryProp: string,
  defaultQueryESClass: string,
  defaultQueryESProp: string
): QueryFiles {
  let queryFile: QueryFiles = {
    class: "",
    property: "",
  };
  // class query and property query are defined
  if (endpoint.queryClass != undefined && endpoint.queryProperty != undefined) {
    queryFile = {
      class: endpoint.queryClass,
      property: endpoint.queryProperty,
    };
    // class query is defined
  } else if (
    endpoint.queryClass != undefined &&
    endpoint.queryProperty === undefined
  ) {
    if (endpoint.type === "search") {
      queryFile = { class: endpoint.queryClass, property: defaultQueryESProp };
    } else {
      queryFile = { class: endpoint.queryClass, property: defaultQueryProp };
    }
    // property query is defined
  } else if (
    endpoint.queryClass === undefined &&
    endpoint.queryProperty != undefined
  ) {
    if (endpoint.type === "search") {
      queryFile = {
        class: defaultQueryESClass,
        property: endpoint.queryProperty,
      };
    } else {
      queryFile = {
        class: defaultQueryClass,
        property: endpoint.queryProperty,
      };
    }
    // neither class query or property query are defined
  } else if (
    endpoint.queryClass === undefined &&
    endpoint.queryProperty === undefined
  ) {
    if (endpoint.type === "search") {
      queryFile = { class: defaultQueryESClass, property: defaultQueryESProp };
    } else {
      queryFile = {
        class: defaultQueryClass,
        property: defaultQueryProp,
      };
    }
  }
  return queryFile;
}

/** CLI function 
 * @returns the cli arguments
 * */ 
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
      choices: ["class", "property", "all"],
      default: ["all"],
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
    showEndpoints: {
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

/** Creates the input for the recommendation() functions.
 * @results list of the input objects that should be searched
 */ 
async function configureInput() {
  // List of inputs that is returned.
  const inputList: Input[] = [];
  // Get the arguments from the command line.
  const argv = await cli();

  if (argv.searchTerm) {
    for (const termIX in argv.searchTerm) {
      // Create the current input object.
      const input: Input = {
        searchTerm: argv.searchTerm[termIX].toString(),
      };
      const conf: Conf = getConfiguration();
      if (argv.endpoint && argv.endpoint[termIX] != undefined) {
        // Check if given endpoint is included in the configuration file
        let included: Boolean = false;
        for (const confIX in conf.endpointNames) {
          if (conf.endpointNames[confIX] === argv.endpoint[termIX]) {
            // Add the endpoint to the input.
            input.endpoint = {
              name: conf.endpointNames[confIX],
              type: conf.endpointTypes[confIX],
              url: conf.endpointUrls[confIX],
              queryClass: conf.queries[confIX].class,
              queryProperty: conf.queries[confIX].property,
            };
            included = true;
          }
        }
        if (included === false) {
          throw Error(
            `ERROR\n\nThe given endpoint (${argv.endpoint[termIX]}) is not included in the configuration file conf.json! Please run yarn recommend -i to see which endpoints are available.`
          );
        }
      }
      inputList.push(input);
    }
  }
  return inputList;
}

// Logs the results
async function run() {
  // Get the arguments from the command line.
  const argv = await cli();
  const conf = getConfiguration();

  // Log only the available endpoint names if verbosity is given.
  if (argv.showEndpoints > 0) {
    console.log(`Endpoint configuration file: ${conf.file}\n\nThe default endpoint is: \x1b[33m${conf.defaultEndpoint.name}\x1b[0m. 
    \nThe available endpoints and their types are:\n`);
    for (let index in conf.endpointNames) {
      console.log(
        `Key Name: \x1b[36m${conf.endpointNames[index]}\x1b[0m\n  -Type: ${conf.endpointTypes[index]}\n  -URL: ${conf.endpointUrls[index]}\n`
      );
    }
  } else {
    // configures the Input for the recommendations.
    const input = await configureInput();

    // To prefer the awesome humanity vocabularies 
    const preferredVocabs = {
      "crm": 100,
      "http://www.cidoc-crm.org/cidoc-crm/CRMinf/": 100,
      "foaf": 100,
      "frbr": 100,
      "gn": 100,
      "gsp": 100,
      "prov": 100,
      "nie": 100,
      "lio": 100,
      "te": 100,
      "perio.do": 100,
      "sem": 100,
      "skos": 100,
      "schema": 100,
      "http://viaf.org/viaf/": 100,
      "http://viaf.org/ontology/1.1/#": 100,
      "http://viaf.org/viaf/data/": 100,
      "https://linked.art/": 100,
      "https://www.ics.forth.gr/isl/index_main.php?l=e&c=711": 100, // Could not find something helpful
      "edm": 100,
      "gvp": 100,
      "https://www.getty.edu/research/tools/vocabularies/aat/": 100,
      "http://vocab.getty.edu/aat/": 100,
      "mrel": 100,
      "juso": 100,
      "https://www.lodewijkpetram.nl/vocab/pnv/doc/": 100,
      "https://w3id.org/pnv#": 100,
      "https://leonvanwissen.nl/vocab/roar/docs/": 100,
      "https://w3id.org/roar#": 100,
      "https://w3id.org/roar/": 100,
      "http://iconclass.org/help/lod": 100,
      "ecpo": 100,
      "mus": 100,
      "https://purl.org/midi-ld/midi": 100, 
      "http://linkeddata.uni-muenster.de/ontology/musicscore/": 100,
      "mo": 100,
      "https://dl-acm-org.vu-nl.idm.oclc.org/citation.cfm?id=3243913": 100,
      "lemon": 100,
      "http://www.lexvo.org/": 100,
      "http://lexvo.org/ontology#": 100,
      "drama": 100,
      "https://github.com/theme-ontology/theming": 100,
      "http://lari-datasets.ilc.cnr.it/": 100
    }

    /** recommend contains
     * [
     *  [
     *    searchTerm: string;
          vocabs: string[];
          homogeneous: Result[]; -> focus on instance scores
          single?: Result[] | any;
     *  ],
     *  [
     *    searchTerm: string;
          vocabs: string[];
          homogeneous: Result[]; -> focus on vocabulary scores
          single?: Result[] | any;
     *  ]
     * ]
     */
    const recommended = await homogeneousRecommendation(
      input,
      conf.defaultEndpoint,
      preferredVocabs
    );

    // Log the search inputs
    for (const inputObj of input) {
      // Log query if verbose level 2
      if (argv.verbose >= 2) {
        if (inputObj.category === "class") {
          console.error(
            replaceAll(
              inputObj.endpoint?.queryClass || conf.defaultEndpoint.queryClass,
              "\\${term}",
              inputObj.searchTerm
            )
          );
        } else if (inputObj.category === "property") {
          console.error(
            replaceAll(
              inputObj.endpoint?.queryProperty ||
                conf.defaultEndpoint.queryProperty,
              "\\${term}",
              inputObj.searchTerm
            )
          );
        } else {
          console.error(
            replaceAll(
              inputObj.endpoint?.queryClass || conf.defaultEndpoint.queryClass,
              "\\${term}",
              inputObj.searchTerm
            )
          );
          console.error(
            replaceAll(
              inputObj.endpoint?.queryProperty ||
                conf.defaultEndpoint.queryProperty,
              "\\${term}",
              inputObj.searchTerm
            )
          );
        }
      }

      // Log the input if verbose level is 1.
      if (argv.format === "text") {
        if (argv.verbose >= 1) {
          console.log(
            "--------------------------------------------------------------"
          );
          console.log(
            `searchTerm: ${inputObj.searchTerm}\ncategory: ${
              inputObj.category
            }\nendpoint: ${
              inputObj.endpoint?.url || conf.defaultEndpoint.url
            }\n`
          );
        }
      }
    }

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
          // Log searchTerm
          outputString += `\nsearchTerm: ${JSON.stringify(
            searchObj.searchTerm,
            null,
            "\t"
          )}\n\n`;
          // Log homogeneous recommendations
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
            homogeneous.score.toFixed(2),
            null,
            "\t"
          )}\n`;
          outputString += `  vocabulary: ${JSON.stringify(
            homogeneous.vocabPrefix,
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
        if (typeof searchObj.single === "object") {
          // Log the results from the SPARQL queries.
          for (const single of searchObj.single) {
            for (const key of Object.keys(single)) {
              if (single[key] != null) {
                if (key === "score") {
                  outputString += `${key}: ${single[key].toFixed(2)}\n`;
                } else {
                  outputString += `${key}: ${single[key]}\n`;
                }
              }
            }
            outputString += `\n`;
          }
        } else {
          // Log the results for Elasticsearch queries
          for (const single of searchObj.single) {
            outputString += `  iri: ${JSON.stringify(
              single.iri,
              null,
              "\t"
            )}\n`;
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
              single.score.toFixed(2),
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
      }
      console.log(outputString);
    }

    // Log the retrieved object.
    if (argv.format == "json") {
      console.log(JSON.stringify(recommended, null, "\t"));
    }
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
