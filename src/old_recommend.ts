#!/usr/bin/env node
import fs, { mkdir } from "fs";

import path from "path";
import {
  assignElasticQuery,
  elasticSuggestions,
} from "./elasticsearch";
import { assignSparqlQuery, sparqlSuggestions } from "./sparql";
import yargs from "yargs/yargs";
import _ from "lodash";
import { Arguments, Bundle, Result, ReturnObject } from "./interfaces";

// input endpoints
let usedEndpointsType: string[] = [];
let usedEndpointsUrl: string[] = [];

// Turn endpoint config file into a list of endpoints and:
// concatonate with given CLI argv endpoints if they are not the default endpoints

export const endpointConfigurationObject = {
  defaultEndpoint: "druid-recommend",
  endpoints: {
    "druid-recommend": {
      type: "elasticsearch",
      url: "https://api.druid.datalegend.net/datasets/VocabularyRecommender/RecommendedVocabularies/services/RecommendedVocabularies/search",
    },
    nde: {
      type: "sparql",
      url: "https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql",
    },
  },
};

// Run and log results function
export async function recommend(argv: Arguments) {
  if (argv.searchTerm) {
    //  Ensure all elements of array are strings
    const searchTerms: string[] = argv.searchTerm.map((term) =>
      term.toString()
    );
    if (argv.category) {
      //  Ensure all elements of array are strings
      const categories: string[] = argv.category.map((term) => term.toString());
      // check if searchterms and categories are same number
      if (searchTerms.length === categories.length) {
        // if no endpoints were provided, use the default for each search term
        if (argv.endpoint.length === 0) {
          console.error(
            `(!) No endpoints were provided, using the default endpoint: ${defaultEndpointName} (!)`
          );
          for (const i in argv.searchTerm) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            usedEndpointsType.push(endpointTypes[indexNum]);
            usedEndpointsUrl.push(endpointUrls[indexNum]);
          }
        }
        // if endpoints were provided but don't match the number of searchTerms
        else {
          for (const i in argv.endpoint) {
            // when endpoints names were provided and exist in config file
            if (endpointNamesFromConfig.includes(argv.endpoint[i])) {
              let indexNum = endpointNamesFromConfig.indexOf(argv.endpoint[i]);
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
            }
            // when endpoint name was provided but does not exist in config file
            else {
              console.error(
                `"${argv.endpoint[i]}" is not found in the availble endpoint config file. The default "${defaultEndpointName}" was used instead.\nAvailable endpoint names: ${endpointNamesFromConfig}.\n`
              );
              let indexNum =
                endpointNamesFromConfig.indexOf(defaultEndpointName);
              usedEndpointsType.push(endpointTypes[indexNum]);
              usedEndpointsUrl.push(endpointUrls[indexNum]);
            }
          }
        }
        // if not enough endpoints are provided, append default untill there are enough
        if (
          argv.endpoint.length > 0 &&
          argv.endpoint.length !== argv.searchTerm.length
        ) {
          if (argv.endpoint.length > argv.searchTerm.length) {
            throw Error(
              "ERROR\n\nThere were more endpoints provided than search terms in the input, please provide the same number of endpoints as search terms"
            );
          }
          console.error(
            `Number of given search terms (${argv.searchTerm?.length}) and endpoints (${argv.endpoint.length}) don\'t match\n\nDefault endpoints were added to match the amount of arguments.`
          );
          while (usedEndpointsUrl.length !== argv.searchTerm?.length) {
            let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName);
            usedEndpointsUrl.push(endpointUrls[indexNum]);
            usedEndpointsType.push(endpointTypes[indexNum]);
          }
        }

        // zip the two arrays into a nested array with the same index ([a,b,c], [d,e,f] --> [[a,d],[b,e],[c,f]])

        // const zipped: [string | undefined, string | undefined, string | undefined][] = _.zip(searchTerms, categories, usedEndpoints)
        const bundled: Bundle[] = [];
        searchTerms.forEach((value, ix) =>
          bundled.push({
            searchTerm: value,
            category: categories[ix],
            endpointType:
              usedEndpointsType[ix] === "sparql" ? "sparql" : "search", // guard
            endpointUrl: usedEndpointsUrl[ix],
          })
        );

        const returnedObjects: ReturnObject[] = []; // the final object containing all returnObjects

        // loop over each bundle (searchTerm, category) to find the results with the given endpoints
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
      } else {
        throw Error(
          `ERROR\n\nInput array length for searchTerm (${argv.searchTerm.length}) and category (${argv.category.length}) is not identical, please provide inputs with the same amount of arguments.`
        );
      }
    } else {
      throw Error(
        'ERROR\n\nNo categories were provided as input argument, please provide a category with: "-c <category>".\nAn example input argument: "-t person -c class"\nUse "-h" or "--help" for more information.'
      );
    }
  } else {
    throw Error(
      'ERROR\n\nNo search terms were provided as input argument, please provide a search term with: "-t <search term>".\nAn example input argument: "-t person -c class"\nUse "-h" or "--help" for more information.'
    );
  }
}
