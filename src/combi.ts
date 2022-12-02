#!/usr/bin/env node
/** TODO:
 * RETRIEVE AND ORDER
 * [x] interfaces: Results
 * [x] searchTerms array from header
 * [x] for each searchTerm, query it with the SPARQL endpoint : Results[]{vocab, url, score}
 * [x] + add score to dict object of distinct vocabs
 * [ ] -> order in desc the names of each vocab $vocabScores && get sorted array of vocabs $vocabSequence
 * [ ] rebase with main/sparqlConfig branch
 * [ ] return score in sparql Result object
 * */
import {
  Arguments,
  Endpoint,
  Recommended,
  ReturnObject,
  Result,
  ReturnedResult,
} from "./interfaces";
import { recommend } from "./recommend";
import fs, { mkdir } from "fs";
import path from "path";

export async function combi() {
  // Get the recommendation results
  const recommended = await getRecommendations(["Person", "loves", "Horse"]);
  // Get the total scores for the vocabularies
  //   const vocabScores: { [key: string]: number } = getVocabScores(recommended);
  //   // Sort the vocabularies ascending
  //   const vocabSequence: string[] = Object.keys(vocabScores).sort(
  //     (second, first) => (vocabScores[second] || -1) - (vocabScores[first] || -1)
  //   );

  console.log(`recommended: ${JSON.stringify(recommended, null, "\t")}`);
  //   console.log(`sequ: ${JSON.stringify(vocabSequence, null, "\t")}`);
  //   console.log(`scores: ${JSON.stringify(vocabScores, null, "\t")}`);
}

function getInput(
  terms: string[],
  endpoints: Endpoint[] = [],
  defaultEndpoint: Endpoint = {
    name: "lov",
    type: "sparql",
    url: "https://api.triplydb.com/datasets/okfn/lov/services/lov/sparql",
    queryClass: fs.readFileSync(path.resolve("./queries/uiClass.rq"), "utf8"),
    queryProperty: fs.readFileSync(path.resolve("./queries/uiProp.rq"), "utf8"),
  }
) {
  const input: Arguments = {
    searchTerms: [],
    categories: [],
    endpoints: endpoints,
    defaultEndpoint: defaultEndpoint,
  };
  for (const term of terms) {
    input.categories.push("class");
    input.categories.push("property");
    input.searchTerms.push(term);
    input.searchTerms.push(term);
  }
  return input;
}

async function getRecommendations(searchTerms: string[]) {
  const input: Arguments = getInput(searchTerms);
  const recommended = await recommend(input);
  const resultList: ReturnedResult[] = [];
  searchTerms.forEach((term) =>
    resultList.push({ searchTerm: term, results: [], vocabs: [] })
  );
  const vocabList: string[] = []
  for (const returnObj of recommended.resultObj) {
    for (const returnedResult of resultList) {
      if (returnedResult.searchTerm === returnObj.searchTerm) {
        for ( const result of returnObj.results) {
          returnedResult.vocabs
        }
        vocabList.push(...returnObj.results.map((result) => result.vocabulary? result.vocabulary: result.iri));
        returnedResult.results.push(...returnObj.results);
      }
      console.log(returnedResult.vocabs.push(new Set(vocabList)))
      // resultList.push(returnedResult)
    }
  }
  return resultList;
}

// Returns a dictionary of the vocabularies in the results and their vocabulary scores.
function getVocabScores(recommended: any): { [key: string]: number } {
  let vocabScores: { [key: string]: number } = {};
  let vocabCounts: { [key: string]: number } = {};
  for (const resultObj of recommended) {
    for (const result of resultObj.results) {
      if (result.vocabulary === "") {
        result.vocabulary = result.iri;
      }
      if (result.vocabulary in vocabScores) {
        vocabScores[result.vocabulary] =
          +vocabScores[result.vocabulary] + +result.score;
        vocabCounts[result.vocabulary] = +vocabCounts[result.vocabulary] + +1;
      } else {
        vocabScores[result.vocabulary] = result.score;
        vocabCounts[result.vocabulary] = 1;
      }
    }
  }
  for (const vocab in vocabCounts) {
    vocabScores[vocab] = vocabScores[vocab] / vocabCounts[vocab];
  }
  return vocabScores;
}
