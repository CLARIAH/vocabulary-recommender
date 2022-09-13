/* 
TODO:
[x] function documentation
[ ] separate files for functions
[ ] improve folder organization
[ ] make NPM module

NEXT:
Make CLI version.

Ideas for interface commands:
recommender sparql json 'Vincent Van Gogh'
recommender [optional service] [optional otherwise return list] [query]

recommender help

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
recommender <service> '<query>'

MAYBE? The flag -json can be used to return the results in json format. 

The <service> can be specified to SPARQL (sparql) or ElasticSearch (elasticsearch) by default.

Example: ~recommender sparql 'person'
--> returns a list of relevant iris



*/

import { elasticSuggestions } from "./elasticSearch";
import { sparqlSuggestions } from "./sparql";

// Contains the options to filter the search results by category.
export enum Category {
  class = "class",
  property = "property",
}

// Run and log results
async function run() {
  const category = Category.class;
  const searchTerm = "Person";
  const sparqlEndpoint =
    "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql";
  const elasticEndpoint =
    "https://api.triplydb.com/datasets/smithsonian/american-art-museum/services/american-art-museum-1/elasticsearch";

  const sparqlSuggested = await sparqlSuggestions(
    category,
    searchTerm,
    sparqlEndpoint
  );
  const elasticSuggested = await elasticSuggestions(
    category,
    searchTerm,
    elasticEndpoint
  );
  // SPARQL results logged
  console.log(
    `This is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${sparqlEndpoint}\n`
  );
  console.log(`\n\nSparql suggestions:\n`);
  console.log(sparqlSuggested);
  // Elastic Search results logged
  console.log(
    `\n\nThis is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${elasticEndpoint}\n`
  );
  console.log(`\n\nElasticsearch suggestions:\n`);
  console.log(elasticSuggested);
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
