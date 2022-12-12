#!/usr/bin/env node
import fs, { mkdir } from "fs";

import path from "path";
import {
  Arguments,
  Input,
  ReturnObject,
  Endpoint,
  UsedEndpoints,
  Bundle,
  QueryFiles,
  Result,
  ShardHit,
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
// Jana: Add the returned type
export async function singleRecommendation(
  inputList: Input[],
  defaultEndpoint: Endpoint
): Promise<ReturnObject[]> {
  // Object that contains the results for every searchTerm
  const returnedObjects: ReturnObject[] = [];

  // prefixes contains all prefixes from lov with their IRI.
  const prefixes = await getPrefixes();

  const bundled: Bundle[] = createBundleList(inputList, defaultEndpoint);

  // returnObject contains the current result for a bundle
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

    const scores: number[] = [];
    // Get the vocabulary name for each iri in results.
    for (const result of results) {
      result.vocabulary = await getVocabName(prefixes, result.iri, true);
      // Jana: Return the domain instead of the iri.
      if (result.vocabulary === "") {
        result.vocabulary = result.iri.match(/(.*[\\/\\#:])(.*)$/)![1];
      }
      scores.push(result.score);
      result.category = bundle.category;
    }
    for (const i in results) {
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

    return returnedObjects
}

// Creates a list of the objects that should be queried.
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
        // Jana: Throw error whenever queryClass is empty
        bundle.query = replaceAll(input.endpoint.queryClass, "\\${term}", bundle.searchTerm);
      } else {
        bundle.query = replaceAll(input.endpoint.queryProperty, "\\${term}", bundle.searchTerm);
      }

      if (allBundle === true) {
        // If the second bundle is needed, add the information about the endpoint.
        secondBundle.endpointType = input.endpoint.type;
        secondBundle.endpointUrl = input.endpoint.url;
        // secondBundle always has the category property
        secondBundle.query = replaceAll(input.endpoint.queryProperty, "\\${term}", bundle.searchTerm);
      }
    } else {
      // Use the defaultEndpoint when no endpoint is specified.
      bundle.endpointType = defaultEndpoint.type;
      bundle.endpointUrl = defaultEndpoint.url;
      if (bundle.category === "class") {
        // Jana: Throw error whenever queryClass or queryProperty are empty
        bundle.query = replaceAll(defaultEndpoint.queryClass, "\\${term}", bundle.searchTerm);
      } else {
        bundle.query = replaceAll(defaultEndpoint.queryProperty, "\\${term}", bundle.searchTerm);
      }
      if (allBundle === true) {
        secondBundle.endpointType = defaultEndpoint.type;
        secondBundle.endpointUrl = defaultEndpoint.url;
        // secondBundle always has the category property
        secondBundle.query = replaceAll(defaultEndpoint.queryProperty, "\\${term}", bundle.searchTerm);
      }
    }

    bundleList.push(bundle);
    if (allBundle === true) {
      bundleList.push(secondBundle);
    }
  }
  return bundleList;
}

function normalizeScore(scores: number[]) {
  const total = scores.reduce((previous, current) => {
    return +previous + +current;
  });
  return scores.map((score) => score / total);
}

// Help function to fill in the searchterm in the SPARQL queries.
export function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}
