import { Result, ShardHit, ShardResponse } from "./interfaces";
import fetch from "cross-fetch";
import { getVocabName } from "./vocabNames";

/**
 * Converts the fetched object in the form of an Elasticsearch recommendation.
 *
 * @param responseBody fetched JSON object
 * @returns JSON object converted into the desired format
 */
export function getSuggestionFromBody(responseBody: ShardResponse): Result[] {
  return responseBody.hits.hits.map((suggestion) => {
    const rdfs_comment = "http://www w3 org/2000/01/rdf-schema#comment";
    const skos_definition = "http://www w3 org/2004/02/skos/core#definition";
    const rdfs_prefLabel = "http://www w3 org/2000/01/rdf-schema#label"
    let description;
    if (suggestion._source.hasOwnProperty(rdfs_comment)) {
      description = suggestion._source[rdfs_comment]?.[0];
    } else if (suggestion._source.hasOwnProperty(skos_definition)) {
      description = suggestion._source[skos_definition]?.[0];
    }
    return {
      iri: suggestion._id,
      score: suggestion._score,
      vocabPrefix: "",
      vocabDomain: "",
      description: Object.prototype.hasOwnProperty.call(
        suggestion._source,
        rdfs_comment
      )
        ? suggestion._source[rdfs_comment]?.[0]
        : suggestion._source[skos_definition]?.[0],
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
  endpoint: string,
  query: string
) {
  // Due to version conflict since v3 isn't compatible with current version of ES
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: query,
  });
  const json = await response.json();
  const shard: ShardResponse = json
  return [getSuggestionFromBody(shard), json];
}
