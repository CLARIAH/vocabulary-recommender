const figlet = require("figlet");
const _ = require("lodash");
import fs from "fs";
import { Result, assignElasticQuery, elasticSuggestions } from "./elasticsearch";
import { assignSparqlQuery, sparqlSuggestions } from "./sparql";
import { returnEndpointService } from "./endpointExtractor";
import { readFileSync } from "fs";
import yargs from "yargs/yargs";

const defaultEndpoints = {
  druidES:
    "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
  druidSparql:
    "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/SPARQL/sparql",
};

// Function that greets the user of the CLI
async function welcomeMessage() {
  figlet("Vocabulary \nRecommender", async function (err: any, data: any) {
    if (err) {
      console.log("Something went wrong...");
      console.dir(err);
      return;
    }
    console.error(await data);
    console.error(`\n
    Welcome to the Linked Data Vocabulary Recommender!\n\n
    Try the following commands:\n
    yarn recommend -t person -c class -s sparql\n\n
    The <service|s> can be specified to SPARQL (sparql) or ElasticSearch (elastic).\n
  
  
    Use help to see the list of available commands:\n
    yarn recommend --help\n\n\n`);
  });
}

// Run and log results function
async function run() {
  //Waiting for arguments
  const argv = await yargs(process.argv.slice(2)).options({
    searchTerm: {
      alias: "t",
      type: "array",
      demandOption: true,
      describe: "Search term used for querying vocabularies",
    },
    category: {
      alias: "c",
      type: "array",
      demandOption: true,
      describe: "Category of IRI",
      choices: ["class", "property"],
    },
    endpoint: {
      alias: "e",
      type: "array",
      default: [defaultEndpoints.druidES, defaultEndpoints.druidSparql],
      describe: "Provide endpoint of the selected service",
    },
    format: {
      alias: "f",
      type: "string",
      default: "iri",
      describe: "Choose output format of the results",
      choices: ["iri", "json"],
    },
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      describe: "Show additional information about search query ~ true|false",
    },
    help: {
      alias: "h",
    },
    verboseQuery: {
      alias: "q",
      type: "boolean",
      default: false,
      describe: "Show the search query ~ true|false",
    },
  }).argv;

  // recognition of service type of given endpoint
  async function recognizeService(endpoint: string) {
    const serviceType = await returnEndpointService(endpoint);
    if (serviceType === "search") {
      return "elastic";
    } else if (serviceType === "sparql") {
      return "sparql";
    } else {
      console.error(
        `ERROR - function returnEndpointService returned: ${serviceType}`
      );
      throw Error("Cannot discern endpoint type");
    }
  }

  //  Ensure all elements of arrays are strings
  const searchTerms = argv.searchTerm.map((term) => term.toString());
  const categories = argv.category.map((term) => term.toString());

  // Bundle interface used for corresponding searchTerm and category
  interface Bundle {
    searchTerm: string;
    category: string;
  }

  if (searchTerms.length === categories.length) {
    // zip the two arrays into a nested array with the same index ([a,b,c], [d,e,f] --> [[a,d],[b,e],[c,f]])
    const zipped: string[][] = _.zip(searchTerms, categories);

    // map the zipped array into an array of Bundle objects
    const bundled: Bundle[] = zipped.map((val) => {
      const combined: Bundle = { searchTerm: val[0], category: val[1] };
      return combined;
    });

    let returnedObjects: any[] = []; // the final object containing all returnObjects

    // loop over each bundle (searchTerm, catergory) to find the results with the given endpoints
    for (let bundle of bundled) {    
      let results: Result[] = [];
      for (let endpoint of argv.endpoint) {
        // check service type of endpoint
        const endpointServiceType = recognizeService(endpoint);

        // search for results
        if ((await endpointServiceType) === "elastic") {
          const elasticSuggested = await elasticSuggestions(
            bundle.category,
            bundle.searchTerm,
            endpoint
          );
          results = results.concat(elasticSuggested);
          
          // Log query
          if (argv.verboseQuery) {
            console.log(JSON.stringify(assignElasticQuery(bundle.category, bundle.searchTerm)))
          }
        } else if ((await endpointServiceType) === "sparql") {
          const sparqlSuggested = await sparqlSuggestions(
            bundle.category,
            bundle.searchTerm,
            endpoint
          );
          // adding the results for the current searchTerm and category for the current endpoint
          results = results.concat(sparqlSuggested);
          
          // Log query
          if (argv.verboseQuery) {
            console.log(assignSparqlQuery(bundle.category)(bundle.searchTerm))
          }
        }
      }

      // Removing duplicate instances from the results (e.g. when different endpoints return the same iri and description)
      results = _.uniqWith(results, _.isEqual);

      // object containing the results of the current searchTerm and category for all searched endpoints
      const returnObject: {
        searchTerm: string;
        category: string;
        endpoints: string[];
        results: Result[];
      } = {
        searchTerm: bundle.searchTerm,
        category: bundle.category,
        endpoints: argv.endpoint,
        results: results,
      };
      returnedObjects.push(returnObject);
      if (argv.verbose) {
        console.log(
          "--------------------------------------------------------------"
        );
        console.log(
          `searchTerm: ${bundle.searchTerm}\ncategory:${bundle.category}\nendpoint list: ${argv.endpoint}\nResults:\n`
        );
      }
      if (argv.format === "iri") {
        for (const result of results) {
          if (result.description) {
            console.log(`${result.iri}\nDescription: ${result.description}\n`);
          } else {
            console.log(`${result.iri}\n`);
          } 
        }
      }
    }
    if (argv.format == "json") {
      console.log(JSON.stringify(returnedObjects, null, "\t"));
    }
  } else {
    throw Error(
      `Input array length for searchTerm (${argv.searchTerm.length}) and catergory (${argv.category.length}) is not identical, please provide input arrays of the same size`
    );
  }
}

// Welcome greetings - greets for first time use or when user hasn't used CLI today
let now = new Date();
if (fs.existsSync("session.log")) {
  let sessionFile = readFileSync("session.log", "utf8");
  let old_now = new Date(sessionFile);
  if (now.getDate() !== old_now.getDate()) {
    fs.writeFile("session.log", now.toISOString(), (err: any) => {
      if (err) throw err;
    });
    welcomeMessage();
  }
} else {
  fs.writeFile("session.log", now.toISOString(), (err: any) => {
    if (err) throw err;
  });
  welcomeMessage();
}

// Start recommender
run().catch((e) => {
  console.error(e);
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
