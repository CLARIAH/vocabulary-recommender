import {
  Arguments,
  ReturnObject,
  Endpoint,
  EndpointLists,
  Bundle,
  Result,
} from "./interfaces";
import { elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";

// Function that can be used different applications to recommend vocabularies
export async function recommend(argv: Arguments) {
  // Object that will be returned in the end
  const returnedObjects: ReturnObject[] = [];

  // endpointInfo contains of a list of endpoint types and a list of endpoint urls
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

  // Get the suggestions
  for (const bundle of bundled) {
    let results: Result[] = [];

    // search for results
    if (bundle.endpointType === "search") {
      const elasticSuggested = await elasticSuggestions(
        bundle.category,
        bundle.searchTerm,
        bundle.endpointUrl
      );
      results = results.concat(elasticSuggested);
    } else if (bundle.endpointType === "sparql") {
      const sparqlSuggested = await sparqlSuggestions(
        bundle.category,
        bundle.searchTerm,
        bundle.endpointUrl
      );
      // adding the results for the current searchTerm and category for the current endpoint
      results = results.concat(sparqlSuggested);
    } else {
      throw new Error(`${bundle.endpointType}`);
    }

    // object containing the results of the current searchTerm and category for all searched endpoints
    const returnObject: ReturnObject = {
      searchTerm: bundle.searchTerm,
      category: bundle.category,
      endpoint: bundle.endpointUrl,
      results,
    };
    returnedObjects.push(returnObject);
  }

  return [returnedObjects, bundled, endpointInfo];
}

// Helpers function to create the list of endpoints
export function endpoints(
  endpoints: Endpoint[],
  defaultEndpoint: Endpoint,
  searchTerms: string[],
  categories: string[]
): EndpointLists {
  const endpointLists: EndpointLists = { types: [], urls: [] };

  // check if searchterms and categories are same number
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
      // Jana: test that whole else part
      // if the number of endpoints is bigger than the number of searchTerms
      if (endpoints.length > searchTerms.length) {
        throw Error(
          "ERROR\n\nThere were more endpoints provided than search terms in the input, please provide the same number of endpoints as search terms"
        );
      } else {
        console.error(
          `Number of given search terms (${searchTerms?.length}) and endpoints (${endpoints.length}) don\'t match\n\nDefault endpoints were added to match the amount of arguments.`
        );
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
