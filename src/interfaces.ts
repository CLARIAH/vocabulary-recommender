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
}

// Combines the corresponding searchTerm, category and endpoint to one list of results.
export interface ReturnObject {
    searchTerm: string 
    category: string 
    endpoint: string 
    results: Result[] 
}

// Defines the shape of the Elasticsearch recommendations.
export interface Result {
    iri: string;
    description?: string;
}

// Defines the endpoints that should be used for the search
export interface EndpointLists {
    types: string[]
    urls: string[]
}

// Defines the shape of an endpoint
export interface Endpoint {
    name: string,
    type: string,
    url: string
}

// Defines the shape of a configured object
export interface Conf {
    file: string,
    defaultEndpoint: Endpoint,
    endpointNames: string[],
    endpointTypes: string[],
    endpointUrls: string[]
}

// Defines the output of the recommender function
export interface Recommended {
    resultObj: ReturnObject[],
    bundled: Bundle[],
}