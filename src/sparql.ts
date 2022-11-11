// Defines the shape of the SPARQL recommendations.
export interface SparqlResult {
  iri: string;
  description: string;
}

// SPARQL query that is used to get the search results for classes.
export const CLASS_SEARCH_SPARQL_QUERY = (
  term: string
) => `prefix owl: <http://www.w3.org/2002/07/owl#>
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
export const PREDICATE_SEARCH_SPARQL_QUERY = (
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
export function assignSparqlQuery(category: string) {
  if (category === "class") {
    return CLASS_SEARCH_SPARQL_QUERY;
  } else if (category === "property") {
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
export async function sparqlSuggestions(
  category: string,
  term: string,
  endpoint: string
) {
  const query = assignSparqlQuery(category);
  const request = new URL(endpoint);
  request.search = `query=${encodeURI(query(term))}`;
  const fetch = require("node-fetch");

  const result = await fetch(request.toString(), {
    method: "GET",
    headers:{
      "Content-Type":"application/sparql-results+json;q=0.9,application/json;q=0.8,*/*;q=0.7"
    }
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
