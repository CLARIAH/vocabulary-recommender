// Defines the shape of a hit.
interface ShardHit {
  _id: string;
  _source: {
    "http://www w3 org/2000/01/rdf-schema#comment"?: string[];
    "http://www w3 org/2004/02/skos/core#definition"?: string[];
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
export interface Result {
  iri: string;
  description?: string;
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
export function assignElasticQuery(category: string, term: string) {
  if (category === 'class') {
    return {
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
  } else if (category === 'property') {
    return {
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
export function getSuggestionFromBody(
  responseBody: ShardResponse
): Result[] {
  return responseBody.hits.hits.map(suggestion => {
    const rdfs_comment = "http://www w3 org/2000/01/rdf-schema#comment"
    const skos_definition = "http://www w3 org/2004/02/skos/core#definition"
    let description
    if (suggestion._source.hasOwnProperty(rdfs_comment)) {
      description = suggestion._source[rdfs_comment]?.[0]
    } else if (suggestion._source.hasOwnProperty(skos_definition)) {
      description = suggestion._source[skos_definition]?.[0]
    }
    return {
      iri: suggestion._id,
      description:
Object.prototype.hasOwnProperty.call(suggestion._source, rdfs_comment)
        ? suggestion._source[rdfs_comment]?.[0]
        : suggestion._source[skos_definition]?.[0]
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
export async function elasticSuggestions(
  category: string,
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
