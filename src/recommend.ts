import {
  Arguments,
  ReturnObject,
  Endpoint,
  UsedEndpoints,
  Bundle,
  Recommended,
  QueryFiles, Result
} from "./interfaces";
import { elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";
import { getPrefixes, getVocabName } from "./vocabNames";

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
  // Object that contains the results
  const returnedObjects: ReturnObject[] = [];

  // prefixes contains all prefixes from lov with their IRI.
  const prefixes = await getPrefixes()

  // endpointInfo contains the list of endpoint types and endpoint urls that will be used for querying
  const endpointInfo: UsedEndpoints = await endpoints(
    argv.endpoints,
    argv.defaultEndpoint,
    argv.searchTerms,
    argv.categories
  );

  // bundled combines the corresponding searchTerm, category, endpoint type, endpoint url and the queries
  const bundled: Bundle[] = createBundleList(
    argv.searchTerms,
    argv.categories,
    endpointInfo
  );

  // returnObject contains the current result for a bundle
  let returnObject: ReturnObject = { 
    searchTerm: '',
    category: '',
    endpoint: { type: "", url: "" },
    results: [],
  }

  // Get the suggestions
  for (const bundle of bundled) {
    // results contains the query results
    let results: Result[] = []

    // search for results
    if (bundle.endpointType === "search") {
      results = await elasticSuggestions(
        bundle.category,
        bundle.searchTerm,
        bundle.endpointUrl
      );
    } else if (bundle.endpointType === "sparql") {
      const query = replaceAll(bundle.query, "\\${term}", bundle.searchTerm)
      const sparqlSuggested = await sparqlSuggestions(
        bundle.endpointUrl,
        query 
      );
      results = sparqlSuggested
    } else {
      throw new Error(`${bundle.endpointType}`);
    }

    // Get the vocabulary name for each iri in results.
    for ( const result of results) {
      result.vocabulary = await getVocabName(prefixes, result.iri, true)
    }

    // object containing the query results of the current searchTerm, category and endpoint.
    returnObject = {
      searchTerm: bundle.searchTerm,
      category: bundle.category,
      endpoint: { type: bundle.endpointType, url: bundle.endpointUrl },
      results: results,
    };
    returnedObjects.push(returnObject);
    results.forEach(r =>  console.log('🪵  | file: recommend.ts | line 98 | score', r.score, r.vocabulary, r.description, r.label ))
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
): UsedEndpoints {
  const endpointLists: UsedEndpoints = { types: [], urls: [], queries: [] };

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
        endpointLists.queries.push({
          class: defaultEndpoint.queryClass ? defaultEndpoint.queryClass : "" ,
          property: defaultEndpoint.queryProperty ? defaultEndpoint.queryProperty : "",
        });
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
          endpointLists.queries.push({
            class: endpoint.queryClass ? endpoint.queryClass : "" ,
            property: endpoint.queryProperty ? endpoint.queryProperty : "",
          })
        }
        while (endpointLists.urls.length !== searchTerms?.length) {
          endpointLists.types.push(defaultEndpoint.type);
          endpointLists.urls.push(defaultEndpoint.url);
          endpointLists.queries.push({
            class: defaultEndpoint.queryClass ? defaultEndpoint.queryClass : "" ,
            property: defaultEndpoint.queryProperty ? defaultEndpoint.queryProperty : "",
          });
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
  endpointInfo: UsedEndpoints
): Bundle[] {
  const bundled: Bundle[] = [];

  for ( const i in searchTerms ){
    const bundle: Bundle = {
      searchTerm: searchTerms[i],
      category: categories[i],
      endpointType: endpointInfo.types[i] === "sparql" ? "sparql" : "search",
      endpointUrl: endpointInfo.urls[i],
      query: ""
    }

    if ( bundle.category === "class") {
      bundle.query = endpointInfo.queries[i].class
    } else {
      bundle.query = endpointInfo.queries[i].property
    }

    bundled.push(bundle)
  }

  return bundled;
}

// Help function to fill in the searchterm in the SPARQL queries.
export function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}
