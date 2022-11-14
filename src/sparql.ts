// Defines the shape of the SPARQL recommendations.
// export interface SparqlResult {
//   iri: string;
// }

import { Result } from "./interfaces";

/**
 * Retrieves the SPARQL results.
 *
 * @param category category type (class or property)
 * @param term search/query string
 * @param endpoint service used
 * @returns a list of JSON objects containing IRI's
 */
export async function sparqlSuggestions(
  category: string,
  term: string,
  endpoint: string,
  query: string
) {
  const request = new URL(endpoint);
  request.search = `query=${encodeURI(query)}`;
  const fetch = require("node-fetch");

  const result = await fetch(request.toString(), {
    method: "GET",
    headers:{
      "Content-Type":"application/sparql-results+json;q=0.9,application/json;q=0.8,*/*;q=0.7"
    }
  });

  if (result.ok) {
    const json: any = await result.json();
    const sparqlResults: Result[] = [];
    for (let row of json) {
      const rowResults: any = {};
      for (const key of Object.keys(row)) {
        if (row[key]) {
          rowResults[key] = row[key];
        }
      }
      sparqlResults.push(rowResults);
    }
    // Return the result in a nice format (sparqlResults)
    // and the json object itself. 
    //The json object will be used to return information from the configured queries. 
    return [sparqlResults, json];
  } else {
    throw Error("Fetching the URL returned bad results.");
  }
}
