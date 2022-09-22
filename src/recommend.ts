const figlet = require("figlet");
import fs from "fs";
import { elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";
import { returnEndpointService } from "./endpointExtractor";
import { readFileSync } from "fs";
import yargs from "yargs/yargs";

const endpoints = {
  druidES:
    "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
  druidSparql:
    "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/SPARQL/sparql",
};


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
      type: "string",
      demandOption: true,
      describe: "Search term used for querying vocabularies",
      // add--> nargs = 1
    },
    category: {
      alias: "c",
      type: "string",
      default: "class",
      describe: "Category of IRI",
      choices: ["class", "property"],
    },
    endpoint: {
      alias: "e",
      type: "string",
      default: endpoints.druidES,
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
  }).argv;

  const searchTerm = argv.searchTerm;
  const category = argv.category;

  // service recognition:
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

  const endpointServiceType = recognizeService(argv.endpoint)

  if ((await endpointServiceType) === "elastic") {
    const elasticSuggested = await elasticSuggestions(
      category,
      searchTerm,
      argv.endpoint
    );
    // Elastic Search results logged
    if (argv.verbose) {
      console.log(
        `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${argv.endpoint}\n`
      );
      console.log(`\n\nSuggestions:\n`);
    }
    // iri or json format
    if (argv.format === "iri") {
      elasticSuggested.forEach((element) => {
        if (element.description) {
          console.log(`${element.iri}\nDescription: ${element.description}\n`);
        } else {
          console.log(`${element.iri}\n`);
        }
      });
    } else if (argv.format === "json") {
      console.log(elasticSuggested);
    }
  }
  // ELSE SPARQL SEARCH
  else if ((await endpointServiceType) === "sparql") {
    const sparqlSuggested = await sparqlSuggestions(
      category,
      searchTerm,
      argv.endpoint
    );
    // SPARQL Search results logged
    if (argv.verbose) {
      console.log(
        `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${argv.endpoint}\n`
      );
      console.log(`\n\nSuggestions:\n`);
    }
    if (argv.format === "iri") {
      sparqlSuggested.forEach((element) => {
        if (element.description) {
          console.log(`${element.iri}\nDescription: ${element.description}\n`);
        } else {
          console.log(`${element.iri}\n`);
        }
      });
    } else if (argv.format === "json") {
      console.log(sparqlSuggested);
    }
  }
}

// Welcome greetings
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
    // now as input
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
