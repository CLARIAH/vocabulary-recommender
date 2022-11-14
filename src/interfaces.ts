// Bundle interface used for corresponding searchTerm and category
export interface Bundle {
  searchTerm: string;
  category: string;
  endpointType: "sparql" | "search";
  endpointUrl: string;
  queryFile: string;
}

export interface Output {
  result: Result[];
  endpointType: string;
}

// Defines the shape of the Elasticsearch recommendations.
export interface Result {
  iri: string;
  description?: string;
}

// Defines the shape of a hit.
export interface ShardHit {
  _id: string;
  _source: {
    "http://www w3 org/2000/01/rdf-schema#comment"?: string[];
    "http://www w3 org/2004/02/skos/core#definition"?: string[];
  };
}

// Defines the shape of the fetched object in elasticSuggestions().
export interface ShardResponse {
  timed_out: boolean;
  hits: {
    hits: ShardHit[];
  };
}
