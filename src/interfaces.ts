// Input argument for the recommendation functions.
export interface Input {
  searchTerm: string;
  category?: string;
  endpoint?: Endpoint;
}

// Bundle interface used for corresponding searchTerm and category
export interface Bundle {
  searchTerm: string;
  category: string;
  endpointType: string;
  endpointUrl: string;
  query: string;
}

// Combines the corresponding searchTerm, category and endpoint to one list of results.
export interface ReturnObject {
  searchTerm: string;
  category: string;
  endpoint: Endpoint;
  results: Result[];
  addInfo: any
}

// Defines the shape of the single recommendations.
export interface Result {
  iri: string;
  description?: string;
  label?: string;
  vocabPrefix: string;
  vocabDomain: string;
  score: number;
  category?: string;
}

// Defines the shape of an endpoint
export interface Endpoint {
  name?: string;
  type: string;
  url: string;
  queryClass: string | "";
  queryProperty: string | "";
}

// Defines the shape of a configured object
export interface Conf {
  file: string;
  defaultEndpoint: Endpoint;
  endpointNames: string[];
  endpointTypes: string[];
  endpointUrls: string[];
  queries: QueryFiles[];
}

// Queries that are used for an endpoint
export interface QueryFiles {
  class: string;
  property: string;
}

// Defines the shape of a hit.
export interface ShardHit {
  _id: string;
  _source: {
    "http://www w3 org/2000/01/rdf-schema#comment"?: string[];
    "http://www w3 org/2004/02/skos/core#definition"?: string[];
  };
  _score: number;
}

// Defines the shape of the fetched object in elasticSuggestions().
export interface ShardResponse {
  timed_out: boolean;
  hits: {
    hits: ShardHit[];
  };
}

// Shape of the output of the homogeneous recommendations function.

export interface ReturnedResult {
  searchTerm: string;
  vocabs: string[];
  homogeneous: Result[];
  single?: Result[] | any;
}
