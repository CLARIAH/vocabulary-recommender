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


// Contains the options to filter the search results by category.
enum Category {
  class = "class",
  property = "property",
}

// Defines the shape of the SPARQL recommendations.
interface SparqlResult {
  iri: string;
  resource: string;
}

// Defines the shape of a hit.
interface ShardHit {
  _id: string;
  _source: {
    "http://www w3 org/2000/01/rdf-schema#comment"?: string[];
  };
}

// Defines the shape of the fetched object in elasticSuggestions().
interface ShardResponse {
  timed_out: boolean;
  hits: {
    hits: ShardHit[];
  };
}

// Defines the shape of the Elasticsearch recommendations.
interface AutocompleteSuggestion {
  iri: string;
  description?: string;
}

// SPARQL query that is used to get the search results for classes.
const CLASS_SEARCH_SPARQL_QUERY = (
  term: string
) => `prefix owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
select distinct ?iri ?description {
  {
    # Support both OWL and RDFS classes.
    {
      ?iri a owl:Class.
    } union {
      ?iri a rdfs:Class.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
    # Prefer classes that match with the search term.
    filter(
      regex(str(?description), "${term}", "i") ||
      # Sometimes IRIs contain substring that can be used to filter.
      regex(str(?iri), "${term}", "i") ||
      regex(str(?label), "${term}", "i"))
  } union {
    # Since the above regex match is relatively crude,
    # also return a tail of arbitrary classes.
    {
      ?iri a owl:Class.
    } union {
      ?iri a rdfs:Class.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
  }
}
limit 10`;

// SPARQL query that is used to get the search results for properties.
const PREDICATE_SEARCH_SPARQL_QUERY = (
  term: string
) => `prefix owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
select distinct ?iri ?description {
  {
    # Support both OWL and RDF properties.
    {
      ?iri a owl:DatatypeProperty.
    } union {
      ?iri a owl:ObjectProperty.
    } union {
      ?iri a rdf:Property.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
    # Prefer classes that match with the search term.
    filter(
      regex(str(?description), "${term}", "i") ||
      # Sometimes IRIs contain substring that can be used to filter.
      regex(str(?iri), "${term}", "i") ||
      regex(str(?label), "${term}", "i"))
  } union {
    # Since the above regex match is relatively crude,
    # also return a tail of arbitrary properties.
    {
      ?iri a rdf:Property.
    } union {
      ?iri a owl:DatatypeProperty.
    } union {
      ?iri a owl:ObjectProperty.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
  }
}
limit 10`;

// Assigns the SPARQL query according to the given category.
function assignSparqlQuery(category: Category) {
  if (category === Category.class) {
    return CLASS_SEARCH_SPARQL_QUERY;
  } else if (category === Category.property) {
    return PREDICATE_SEARCH_SPARQL_QUERY;
  } else {
    throw Error("Category does not exist! Please provide existing category.");
  }
}


/** 
 * Retrieves the SPARQL results.
 * 
 * @param category category type (class or property)
 * @param term search/query string
 * @param endpoint service used
 * @returns a list of JSON objects containing IRI's
 */
async function sparqlSuggestions(
  category: Category,
  term: string,
  endpoint: string
) {
  const query = assignSparqlQuery(category);
  const request = new URL(endpoint);
  request.search = `query=${encodeURI(query(term))}`;
  const fetch = require("node-fetch");
  const result = await fetch(request.toString(), {
    method: "GET",
    Accept:
      "application/sparql-results+json;q=0.9,application/json;q=0.8,*/*;q=0.7",
  });

  if (result.ok) {
    const json: any = await result.json();
    const sparqlResults: SparqlResult[] = [];
    for (let row of json) {
      const rowResults: any = {};
      for (const key of Object.keys(row)) {
        if (row[key]) {
          rowResults[key] = row[key];
        }
      }
      sparqlResults.push(rowResults);
    }
    return sparqlResults;
  } else {
    throw Error("Fetching the URL returned bad results.");
  }
}

/**
 * Assigns the Elasticsearch query according to the given category.
 * @remarks Multiple search methods are made optional - see 'should:' 
 * 
 * @param category category type (class or property)
 * @param term search/query string
 * @returns JSON search object used for the ES search query
 * 
 */
function assignElasticQuery(category: Category, term: string) {
  if (category === Category.class) {
    const CLASS_SEARCH_ELASTIC_QUERY = {
      query: {
        bool: {
          must: {
            simple_query_string: {
              query:
                "http://www.w3.org/2002/07/owl#Class | http://www.w3.org/2000/01/rdf-schema#Class",
              fields: ["http://www w3 org/1999/02/22-rdf-syntax-ns#type"],
            },
          },
          should: [
            {
              simple_query_string: {
                query: term,
                fields: ["http://www w3 org/2000/01/rdf-schema#comment"],
              },
            },
            {
              wildcard: {
                "http://www.w3.org/2000/01/rdf-schema#label": term + "*",
              },
            },
            { fuzzy: { "http://www w3 org/2000/01/rdf-schema#label": term } },
            { match: { "@id": term } },
          ],
          minimum_should_match: 1,
        },
      },
    };
    return CLASS_SEARCH_ELASTIC_QUERY;
  } else if (category === Category.property) {
    const PREDICATE_SEARCH_ELASTIC_QUERY = {
      query: {
        bool: {
          must: {
            simple_query_string: {
              query:
                "http://www.w3.org/2002/07/owl#DatatypeProperty | http://www.w3.org/2002/07/owl#ObjectProperty | http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
              fields: ["http://www w3 org/1999/02/22-rdf-syntax-ns#type"],
            },
          },
          should: [
            {
              simple_query_string: {
                query: term,
                fields: ["http://www w3 org/2000/01/rdf-schema#comment"],
              },
            },
            {
              wildcard: {
                "http://www.w3.org/2000/01/rdf-schema#label": term + "*",
              },
            },
            { fuzzy: { "http://www w3 org/2000/01/rdf-schema#label": term } },
            { match: { "@id": term } },
          ],
          minimum_should_match: 1,
        },
      },
    };
    return PREDICATE_SEARCH_ELASTIC_QUERY;
  } else {
    throw Error("Category does not exist! Please provide existing category.");
  }
}

/** 
 * Converts the fetched object in the form of an Elasticsearch recommendation.
 * 
 * @param responseBody fetched JSON object
 * @returns JSON object converted into the desired format
 */
function getSuggestionFromBody(
  responseBody: ShardResponse
): AutocompleteSuggestion[] {
  return responseBody.hits.hits.map((suggestion) => {
    return {
      iri: suggestion._id,
      description:
        suggestion._source["http://www w3 org/2000/01/rdf-schema#comment"]?.[0],
    };
  });
}


/**
 * Retrieves the Elasticsearch results.
 * @remarks see assignElasticQuery for use of category and term parameters
 * 
 * @param category category type (class or property)
 * @param term search/query string
 * @param endpoint service used
 * @returns a list of JSON objects containing IRI's
 */
async function elasticSuggestions(
  category: Category,
  term: string,
  endpoint: string
) {
  const searchObject = assignElasticQuery(category, term);

  // Due to version conflict since v3 isn't compatible with current version of ES
  const fetch = require("node-fetch");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchObject),
  });
  const json: ShardResponse = await response.json();
  return getSuggestionFromBody(json);
}


// Run and log results
async function run() {
  const category = Category.class;
  const searchTerm = "Person";
  const sparqlEndpoint =
    "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql";
  const elasticEndpoint =
    "https://api.triplydb.com/datasets/smithsonian/american-art-museum/services/american-art-museum-1/elasticsearch";
  //const elasticEndpoint = 'https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search'

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
