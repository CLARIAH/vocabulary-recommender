/* 
TODO:
[ ] make NPM module

 __      __             _           _                                 
 \ \    / /            | |         | |                                
  \ \  / /__   ___ __ _| |__  _   _| | __ _ _ __ _   _                
   \ \/ / _ \ / __/ _` | '_ \| | | | |/ _` | '__| | | |               
    \  / (_) | (_| (_| | |_) | |_| | | (_| | |  | |_| |               
  ___\/ \___/ \___\__,_|_.__/ \__,_|_|\__,_|_|   \__, |   _           
 |  __ \                                          __/ |  | |          
 | |__) |___  ___ ___  _ __ ___  _ __ ___   ___ _|___/ __| | ___ _ __ 
 |  _  // _ \/ __/ _ \| '_ ` _ \| '_ ` _ \ / _ \ '_ \ / _` |/ _ \ '__|
 | | \ \  __/ (_| (_) | | | | | | | | | | |  __/ | | | (_| |  __/ |   
 |_|  \_\___|\___\___/|_| |_| |_|_| |_| |_|\___|_| |_|\__,_|\___|_|   
                                                                      
                                                                      
Welcome to the Linked Data Vocabulary Recommender!

Try the following commands:
yarn build && yarn recommend -t person -c class -s sparql
--> returns a list of relevant iris

MAYBE? 
The flag -json can be used to return the results in json format. 
'yarn recommend help' should return all the commands that can be used.

The <service> can be specified to SPARQL (sparql) or ElasticSearch (elastic).
*/

import { elasticSuggestions } from "./elasticSearch";
import { sparqlSuggestions } from "./sparql";
import yargs from "yargs/yargs";

// Run and log results
async function run() {
  const argv = await yargs(process.argv.slice(2)).options({
    searchTerm: { alias: "t", type: "string", default: "Person" },
    category: { alias: "c", type: "string", default: "class" },
    service: { alias: "s", type: "string", default: "elastic" },
    endpoint: { alias: "e", type: "string", default: '' },
  }).argv;
  const searchTerm = argv.searchTerm;
  const category = argv.category;

  if (argv.service === "elastic") {
    if(argv.endpoint === ''){
      const elasticSuggested = await elasticSuggestions(
      category,
      searchTerm,
      "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search"
    );
    // Elastic Search results logged
    console.log(
      `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${"https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search"}\n`
    );
    console.log(`\n\nElasticsearch suggestions:\n`);
    console.log(elasticSuggested);
    } else {
      const elasticSuggested = await elasticSuggestions(
        category,
        searchTerm,
        argv.endpoint
      );
      // Elastic Search results logged
      console.log(
        `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${argv.endpoint}\n`
      );
      console.log(`\n\nElasticsearch suggestions:\n`);
      console.log(elasticSuggested);
    }
  } else {
    if(argv.endpoint === ''){
      const sparqlSuggested = await sparqlSuggestions(
      category,
      searchTerm,
      "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql"
    );
    // Sparql Search results logged
    console.log(
      `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${"https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql"}\n`
    );
    console.log(`\n\Sparql suggestions:\n`);
    console.log(sparqlSuggested);
    } else {
      const sparqlSuggested = await sparqlSuggestions(
        category,
        searchTerm,
        argv.endpoint
      );
      // Elastic Search results logged
      console.log(
        `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${argv.endpoint}\n`
      );
      console.log(`\n\nElasticsearch suggestions:\n`);
      console.log(sparqlSuggested);
    }
  }

    // const elasticEndpoint =
  //   "https://api.triplydb.com/datasets/smithsonian/american-art-museum/services/american-art-museum-1/elasticsearch";

  
}
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
