// Bundle interface used for corresponding searchTerm and category
export interface Bundle {
  searchTerm: string;
  category: string;
  endpointType: "sparql" | "search";
  endpointUrl: string;
  queryFile: string;
}

// Defines the shape of the Elasticsearch recommendations.
export interface Result {
  iri: string;
  description?: string;
}

export interface Output {
  result: Result[];
  endpointType: string;
}
