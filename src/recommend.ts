const figlet = require("figlet");
const fs = require('fs')

import { elasticSuggestions } from "./elasticSearch";
import { sparqlSuggestions } from "./sparql";
import yargs from "yargs/yargs";
import { boolean } from "yargs";
import { readFileSync } from "fs";

function hello(){
  figlet("Vocabulary \nRecommender", async function (err: any, data: any) {
    if (err) {
      console.log("Something went wrong...");
      console.dir(err);
      return;
    }
    console.log(await data);
    console.log(`\n
    Welcome to the Linked Data Vocabulary Recommender!\n\n
    Try the following commands:\n
    yarn build && yarn recommend -t person -c class -s sparql\n\n
    The <service|s> can be specified to SPARQL (sparql) or ElasticSearch (elastic).\n
  
  
    Use help to see the list of available commands:\n
    yarn recommend --help\n\n\n`);
  });  
}

// Run and log results function 
async function run() {
  //Waiting for arguments
  const argv = await yargs(process.argv.slice(2)).options({
    searchTerm: { alias: "t", type: "string", default: "Person", describe:'Search term used for querying vocabularies'},
    category: { alias: "c", type: "string", default: "class", describe:'Category of IRI', choices:['class','property']},
    service: { alias: "s", type: "string", default: "elastic", describe:'Service used to query vocabulary', choices:['elastic','sparql']},
    endpoint: { alias: "e", type: "string", default: "" , describe:'Optional: provide endpoint of the selected service'},
    format: { alias: "f", type: "string", default: "iri", describe:'Choose output format of the results', choices:['iri','json']},
    verbose: { alias: "v", type: 'boolean', default: false , describe:'Show additional information about search query ~ true|false'},
  }).argv;

  const searchTerm = argv.searchTerm;
  const category = argv.category;

  if (argv.service === "elastic") {
    if (argv.endpoint === "") {
      const elasticSuggested = await elasticSuggestions(
        category,
        searchTerm,
        "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search"
      );
      // Elastic Search results logged
      if (argv.verbose) {
        console.log(
          `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${"https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search"}\n`
        );
        console.log(`\n\nElasticsearch suggestions:\n`);
      }
      if (argv.format === "iri") {
        elasticSuggested.forEach((element) => {
          if (element.description) {
            console.log(
              `${element.iri}\nDescription: ${element.description}\n`);
          } else {
            console.log(`${element.iri}\n`);
          }
        });
      } else if (argv.format === "json") {
        console.log(elasticSuggested);
      }
    } else {
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
        console.log(`\n\nElasticsearch suggestions:\n`);}
      // iri or json format
      if (argv.format === "iri") {
        elasticSuggested.forEach((element) => {
          if (element.description) {
            console.log(
              `${element.iri}\nDescription: ${element.description}\n`);
          } else {
            console.log(`${element.iri}\n`);
          }
        });
      } else if (argv.format === "json") {
        console.log(elasticSuggested);
      }
    }
  } else {
    if (argv.endpoint === "") {
      const sparqlSuggested = await sparqlSuggestions(
        category,
        searchTerm,
        "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/SPARQL/sparql"
      );

      // SPARQL Search results logged
      if (argv.verbose) {
        console.log(
          `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${"https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql"}\n`
        );
        console.log(`\n\Sparql suggestions:\n`);}

        if (argv.format === "iri") {
          sparqlSuggested.forEach((element) => {
            if (element.description) {
              console.log(
                `${element.iri}\nDescription: ${element.description}\n`);
            } else {
              console.log(`${element.iri}\n`);
            }
          });
        } else if (argv.format === "json") {
          console.log(sparqlSuggested);
        }
    } else {
      const sparqlSuggested = await sparqlSuggestions(
        category,
        searchTerm,
        argv.endpoint
      );
      // SPARQL Search results logged
      if (argv.verbose){
        console.log(
          `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${argv.endpoint}\n`
        );
        console.log(`\n\nElasticsearch suggestions:\n`);
      }
      if (argv.format === "iri") {
        sparqlSuggested.forEach((element) => {
          if (element.description) {
            console.log(
              `${element.iri}\nDescription: ${element.description}\n`);
          } else {
            console.log(`${element.iri}\n`);
          }
        });
      } else if (argv.format === "json") {
        console.log(sparqlSuggested);
      }
    }
  }
}

// Welcome greetings
let now = new Date()
fs.exists('session.log', (exist: any)=>{
  if (exist){
    let sessionFile = readFileSync('session.log', 'utf8')
    let old_now = new Date(sessionFile)
    if (now.getDate() !== old_now.getDate()){
      fs.writeFile('session.log', now.toISOString(), (err: any) => {
        if (err) throw err;})
      hello()
    }
  }else{
    // now as input
    fs.writeFile('session.log', now.toISOString(), (err: any) => {
      if (err) throw err;})
    hello()
  }
})

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
