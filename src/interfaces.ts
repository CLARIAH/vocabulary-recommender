// Interface for the arguments of the recommend function in recommend.ts
export interface Arguments {
    searchTerms: string[]
    categories: string[]
    endpoints: Endpoint[] 
    defaultEndpoint: Endpoint
}

// Bundle interface used for corresponding searchTerm and category
export interface Bundle {
    searchTerm: string 
    category: string 
    endpointType: "sparql" | "search" 
    endpointUrl: string 
    query: string
}

// Combines the corresponding searchTerm, category and endpoint to one list of results.
export interface ReturnObject {
    searchTerm: string 
    category: string 
    endpoint: Endpoint 
    results: Result[] 
}

// Defines the shape of the Elasticsearch recommendations.
export interface Result {
    iri: string;
    description?: string
    label?: string
    vocabulary?: string
    score: number
}

// Defines the endpoints that should be used for the search
export interface UsedEndpoints {
    types: string[]
    urls: string[]
    queries: QueryFiles[]
}

// Defines the shape of an endpoint
export interface Endpoint {
    name?: string
    type: string
    url: string
    queryClass?: string
    queryProperty?: string
}

// Defines the shape of a configured object
export interface Conf {
    file: string
    defaultEndpoint: Endpoint
    endpointNames: string[]
    endpointTypes: string[]
    endpointUrls: string[]
    queries: QueryFiles[]
}

// Defines the output of the recommender function
export interface Recommended {
    resultObj: ReturnObject[]
    bundled: Bundle[]
}

export interface QueryFiles {
    class: string;
    property: string;
}

// Defines the shape of a hit.
export interface ShardHit {
  _id: string;
  _source: {
    "http://www w3 org/2000/01/rdf-schema#comment"?: string[]
    "http://www w3 org/2004/02/skos/core#definition"?: string[]
  };
}

// Defines the shape of the fetched object in elasticSuggestions().
export interface ShardResponse {
  timed_out: boolean
  hits: {
    hits: ShardHit[]
  };
}

export interface ReturnedResult {
    category: "class" | "property";
    results: Result[];
    vocabularies: { [key: string]: number };
  }
