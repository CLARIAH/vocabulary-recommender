import {
  Arguments,
  ReturnObject,
  Endpoint,
  EndpointLists,
  Bundle,
  Result,
  Recommended
} from "./interfaces";
import { elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";

/** Function that can be used for different applications to recommend vocabularies
 * Input    
 *  searchTerms: string[]
 *  categories: string[]
 *  endpoints: Endpoint[] 
 *  defaultEndpoint: Endpoint
 * Output: 
 *  resultObj: ReturnObject[]
 *  bundled: Bundle[]
*/
export async function recommend(argv: Arguments): Promise<Recommended> {
  // Object that containes the results
  const returnedObjects: ReturnObject[] = [];

  // endpointInfo contains the list of endpoint types and endpoint urls that will be used for querying
  const endpointInfo: EndpointLists = await endpoints(
    argv.endpoints,
    argv.defaultEndpoint,
    argv.searchTerms,
    argv.categories
  );

  // bundled combines the corresponding searchTerm, category, endpoint type and endpoint url
  const bundled: Bundle[] = createBundleList(
    argv.searchTerms,
    argv.categories,
    endpointInfo
  );

  // returnObject containes the current result for a bundle
  let returnObject: ReturnObject = { 
    searchTerm: '',
    category: '',
    endpoint: '',
    results: []
  }

  // Get the suggestions
  for (const bundle of bundled) {
    // results contains the query results
    let results: Result[] = [];

    // search for results
    if (bundle.endpointType === "search") {
      results = await elasticSuggestions(
        bundle.category,
        bundle.searchTerm,
        bundle.endpointUrl
      );
    } else if (bundle.endpointType === "sparql") {
      results = await sparqlSuggestions(
        bundle.category,
        bundle.searchTerm,
        bundle.endpointUrl
      );
    } else {
      throw new Error(`${bundle.endpointType}`);
    }
    // object containing the query results of the current searchTerm, category and endpoint
    returnObject = {
      searchTerm: bundle.searchTerm,
      category: bundle.category,
      endpoint: bundle.endpointUrl,
      results: results,
    };
    returnedObjects.push(returnObject);
  }

  return {
    resultObj: returnedObjects,
    bundled: bundled,
  }
}

// Helpers function to create the list of endpoints that will be used for the search
export function endpoints(
  endpoints: Endpoint[],
  defaultEndpoint: Endpoint,
  searchTerms: string[],
  categories: string[]
): EndpointLists {
  const endpointLists: EndpointLists = { types: [], urls: [] };

  // check if amount of searchterms and categories is the same
  if (searchTerms.length === categories.length) {
    // if no endpoints were provided, use the default for each search term
    if (endpoints.length === 0) {
      console.error(
        `(!) No endpoints were provided, using the default endpoint: ${defaultEndpoint.name} (!)`
      );
      for (const i in searchTerms) {
        endpointLists.types.push(defaultEndpoint.type);
        endpointLists.urls.push(defaultEndpoint.url);
      }
    }
    // if endpoints were provided
    else {
      // if the amount of endpoints is bigger than the number of searchTerms
      if (endpoints.length > searchTerms.length) {
        throw Error(
          "ERROR\n\nThere were more endpoints provided than search terms in the input, please provide the same number of endpoints as search terms"
        );
      } else {
        if ( endpoints.length < searchTerms.length ) {
          console.error(
            `Number of given search terms (${searchTerms?.length}) and endpoints (${endpoints.length}) don\'t match\n\nDefault endpoints were added to match the amount of arguments.`
          );
        }
        for (const endpoint of endpoints) {
          endpointLists.types.push(endpoint.type);
          endpointLists.urls.push(endpoint.url);
        }
        while (endpointLists.urls.length !== searchTerms?.length) {
          endpointLists.types.push(defaultEndpoint.type);
          endpointLists.urls.push(defaultEndpoint.url);
        }
      }
    }
  }
  return endpointLists;
}

// Helpers function to make the List of Bundles
export function createBundleList(
  searchTerms: string[],
  categories: string[],
  endpointInfo: EndpointLists
): Bundle[] {
  const bundled: Bundle[] = [];
  searchTerms.forEach((value, ix) =>
    bundled.push({
      searchTerm: value,
      category: categories[ix],
      endpointType: endpointInfo.types[ix] === "sparql" ? "sparql" : "search", // guard
      endpointUrl: endpointInfo.urls[ix],
    })
  );
  return bundled;
}
