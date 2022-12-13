import {
  Input,
  ReturnObject,
  Endpoint,
  Bundle,
  Result,
} from "./interfaces";
import { elasticSuggestions } from "./elasticsearch";
import { sparqlSuggestions } from "./sparql";
import { getPrefixes, getVocabName } from "./vocabNames";

/** Function that can be used for different applications to recommend vocabularies.
 * @param inputList list of the searchTerms and their configurations 
 * @param defaultEndpoint endpoint that should be used if no endpoint is specified 
 * 
 *  @returns List of the results for each searchTerm
 */
export async function singleRecommendation(
  inputList: Input[],
  defaultEndpoint: Endpoint
): Promise<ReturnObject[]> {
  // Object that contains the end results for every searchTerm.
  const returnedObjects: ReturnObject[] = [];

  // prefixes contains all prefixes from lov with their IRI.
  const prefixes = await getPrefixes();

  // bundled contains the search objects.
  const bundled: Bundle[] = createBundleList(inputList, defaultEndpoint);

  // returnObject contains the current result for a bundle.
  let returnObject: ReturnObject = {
    searchTerm: "",
    category: "",
    endpoint: { type: "", url: "", queryClass: "", queryProperty: "" },
    results: [],
    addInfo: {},
  };

  // Get the suggestions
  for (const bundle of bundled) {
    // results contains the query results
    let results: Result[] = [];
    // contains the json object for configured queries
    let addInfo: any;
    // search for results
    if (bundle.endpointType === "search") {
      const elasticSuggested = await elasticSuggestions(
        bundle.endpointUrl,
        bundle.query
      );
      results = elasticSuggested[0];
      addInfo = elasticSuggested[1];
    } else if (bundle.endpointType === "sparql") {
      const sparqlSuggested = await sparqlSuggestions(
        bundle.endpointUrl,
        bundle.query
      );
      results = sparqlSuggested[0];
      addInfo = sparqlSuggested[1];
    } else {
      throw new Error(`${bundle.endpointType}`);
    }
    // List of the result scores. It is used to normalize the scores.
    const scores: number[] = [];
    // Get the vocabulary name for each iri in results.
    for (const result of results) {
      result.vocabPrefix = await getVocabName(prefixes, result.iri, true);
      result.vocabDomain = result.iri.match(/(.*[\\/\\#:])(.*)$/)![1];
      // Returns the domain if no prefix name could be found.
      if (result.vocabPrefix === "") {
        result.vocabPrefix = result.vocabDomain
      }
      scores.push(result.score);
      result.category = bundle.category;
    }
    for (const i in results) {
      // Normalize the scores
      results[i].score = normalizeScore(scores)[i];
      if (bundle.endpointType === "search") {
        addInfo.hits.hits[i]._score = normalizeScore(scores)[i];
      } else {
        addInfo[i].score = normalizeScore(scores)[i];
      }
    }
    if (bundle.category === "class") {
      // object containing the query results of the current searchTerm, category and endpoint.
      returnObject = {
        searchTerm: bundle.searchTerm,
        category: bundle.category,
        endpoint: {
          type: bundle.endpointType,
          url: bundle.endpointUrl,
          queryClass: bundle.query,
          queryProperty: "",
        },
        results: results,
        addInfo: addInfo,
      };
    } else {
      // object containing the query results of the current searchTerm, category and endpoint.
      returnObject = {
        searchTerm: bundle.searchTerm,
        category: bundle.category,
        endpoint: {
          type: bundle.endpointType,
          url: bundle.endpointUrl,
          queryClass: "",
          queryProperty: bundle.query,
        },
        results: results,
        addInfo: addInfo,
      };
    }
    returnedObjects.push(returnObject);
  }

  /**
   * [
   *  {
   *    searchTerm: "Person",
   *    category: "class",
   *    endpoint: 
   *    { 
   *      type: "search",
   *      url: "https...",
   *      queryClass: "prefix foaf:..."
   *      queryProperty: ""
   *    },
   *    results: [
	        {
		        "iri": "https://schema.org/Person",
		        "label": "Person",
		        "score": 0.7,
		        "vocabulary": "schema",
		        "category": "class"
	        },...
   *    ], 
        addInfo: [
          {
		        "iri": "https://schema.org/Person",
		        "label": "Person",
		        "score": 0.7,
		        "vocabulary": "schema",
		        "category": "class",
            "image": "person.jpg",...
	        },...
        ]
   */
  return returnedObjects;
}

/** Creates a list of the objects that should be queried.
 * @param inputList list of the searchTerms and their configurations 
 * @param defaultEndpoint endpoint that should be used if no endpoint is specified 
 * 
 * @retunrs list of search objects
 *  */ 
function createBundleList(
  inputList: Input[],
  defaultEndpoint: Endpoint
): Bundle[] {
  // List that is returned
  const bundleList: Bundle[] = [];

  // Loop through the input.
  for (const input of inputList) {
    // Create the current bundle object.
    const bundle: Bundle = {
      searchTerm: input.searchTerm,
      category: "",
      endpointType: "sparql",
      endpointUrl: "",
      query: "",
    };
    // Create a second bundle object if the category is "all".
    const secondBundle: Bundle = {
      searchTerm: input.searchTerm,
      category: "property",
      endpointType: "sparql",
      endpointUrl: "",
      query: "",
    };
    // Becomes true if the second bundle object is needed.
    let allBundle: Boolean = false;

    if (input.category) {
      if (input.category != "all") {
        // If the category is specified, add it to the bundle.
        bundle.category = input.category;
      } else {
        // If the category is "all", use the second bundle.
        bundle.category = "class";
        allBundle = true;
      }
    } else {
      // Use category "all" as default.
      bundle.category = "class";
      allBundle = true;
    }

    if (input.endpoint) {
      // Add the information about the endpoint to the bundle object.
      bundle.endpointType = input.endpoint.type;
      bundle.endpointUrl = input.endpoint.url;

      if (bundle.category === "class") {
        // Include the searchTerm in the query and add the query string to the bundle.
        bundle.query = replaceAll(
          input.endpoint.queryClass,
          "\\${term}",
          bundle.searchTerm
        );
      } else {
        bundle.query = replaceAll(
          input.endpoint.queryProperty,
          "\\${term}",
          bundle.searchTerm
        );
      }

      if (allBundle === true) {
        // If the second bundle is needed, add the information about the endpoint.
        secondBundle.endpointType = input.endpoint.type;
        secondBundle.endpointUrl = input.endpoint.url;
        // secondBundle always has the category property.
        secondBundle.query = replaceAll(
          input.endpoint.queryProperty,
          "\\${term}",
          bundle.searchTerm
        );
      }
    } else {
      // Use the defaultEndpoint when no endpoint is specified.
      bundle.endpointType = defaultEndpoint.type;
      bundle.endpointUrl = defaultEndpoint.url;
      if (bundle.category === "class") {
        bundle.query = replaceAll(
          defaultEndpoint.queryClass,
          "\\${term}",
          bundle.searchTerm
        );
      } else {
        bundle.query = replaceAll(
          defaultEndpoint.queryProperty,
          "\\${term}",
          bundle.searchTerm
        );
      }
      if (allBundle === true) {
        secondBundle.endpointType = defaultEndpoint.type;
        secondBundle.endpointUrl = defaultEndpoint.url;
        // secondBundle always has the category property
        secondBundle.query = replaceAll(
          defaultEndpoint.queryProperty,
          "\\${term}",
          bundle.searchTerm
        );
      }
    }

    bundleList.push(bundle);
    // Only add the second bundle if it is needed.
    if (allBundle === true) {
      bundleList.push(secondBundle);
    }
  }
  return bundleList;
}

/** Normalizes the scores for a list of numbers 
 * @param scores list of scores
 * @returns list of normalised scores
*/
export function normalizeScore(scores: number[]) {
  const total = scores.reduce((previous, current) => {
    return +previous + +current;
  });
  return scores.map((score) => score / total);
}

/** Help function to fill in the searchTerm in the given query.
 * @param str queried string
 * @param find search string
 * @param replace string that replaces the search string
 * 
 * @returns the queried in which the occurences of the search string are replaced with replace
 */
export function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}
