/** TODO:
 * RETRIEVE AND ORDER
 * [x] interfaces: Results
 * [x] searchTerms array from header
 * [x] for each searchTerm, query it with the SPARQL endpoint : Results[]{vocab, url, score}
 * [x] + add score to dict object of distinct vocabs
 * [x] -> order in desc the names of each vocab $vocabScores && get sorted array of vocabs $vocabSequence
 * [x] rebase with main/sparqlConfig branch
 * [x] return score in sparql Result object
 * */

import { Result, ReturnedResult } from "./interfaces";
import { replaceAll } from "./recommend";
import { sparqlSuggestions } from "./sparql";

/**
 * @param terms array of strings containing the query/search terms
 * @param query the SPARQL searchquery object for the Class or Property
 * @returns Function returns an array of two ReturnedResults objects of Classes and Propberties Result objects and its vocabulary scores
 */
export async function queryResultsSparql(
  terms: string[],
  queryOpts: { defaultQueryClass: string; defaultQueryProperty: string },
  endpoint: string
): Promise<ReturnedResult[][]> {
  const returnedResults: ReturnedResult[][] = []
  const finalClassVocabs: { [key: string]: number } = {}; // set of vocab terms and relevant score
  const finalPropertyVocabs: { [key: string]: number } = {}; // set of vocab terms and relevant score
  for (const term of terms) {
    // creating the input queries for the SPARQL endpoint
    const queryClass = replaceAll(queryOpts.defaultQueryClass, "\\${term}", term);
    const queryProperty = replaceAll(queryOpts.defaultQueryProperty, "\\${term}", term);
    // retieving results for the term for Classes and Properties
    const queryResultClass: Result[] = await sparqlSuggestions(endpoint, queryClass);
    const queryResultProperty: Result[] = await sparqlSuggestions(endpoint, queryProperty);
    // mapping each result element and appending it to respective Class or Property result array
    queryResultClass.forEach((result) => {
      // add scores to dictionairy
      finalClassVocabs[result.iri] = finalClassVocabs[result.iri] + result.score // BUG: this will give the iri of the term, not the vocab ==> get vocab should also return domain if no vocab is found
    });
    queryResultProperty.forEach((result) => {
      // add scores to dictionairy
      finalPropertyVocabs[result.iri] = finalClassVocabs[result.iri] + result.score;
    });
    const classResult: ReturnedResult = {
        category: "class",
        results: queryResultClass,
        vocabularies: finalClassVocabs,
    };
    
    const propertyResult: ReturnedResult = {
        category: "property",
        results: queryResultProperty,
        vocabularies: finalPropertyVocabs,
    };
    returnedResults.push([classResult, propertyResult])
}

return returnedResults

}
/* 
returnedResults look like this: [[class_results, property_results], [class_results, property_results], [class_results, property_results]]

class_results and property_results look like this:

{
    category: "class" | "property"; // <-- shows if it is a class or property e.g. returnedResults[0][0].category == "class" && returnedResults[0][1].category == "property"
    results: Result[];
    vocabularies: { [key: string]: number }; <-- this needs to be sorted in desc order
}
*/

function sortVocabularyDescScore(vocabularyScoreDict: { [key: string]: number }): {[key: string]: number} {
	const sortedObject: { [key: string]: number } = {}

  // Create the array of the key-value pairs
  var vocabularyScoreArray: [string, number][] = Object.keys(vocabularyScoreDict).map((key) => {
    return [key, vocabularyScoreDict[key]];
  });

  // Sort the array based on the second element (i.e. the value)in descending order
  vocabularyScoreArray.sort((first, second) => {
    return second[1] - first[1]
  });
	for (const vocabScore of vocabularyScoreArray) {
		const use_key = vocabScore[0]
		const use_value = vocabScore[1]
		sortedObject[use_key] = use_value
	}
	return sortedObject
}
	


// COMBISCORE IMPLEMENTATION
/**
 * IMPLEMENT PRUNING
 * [ ] combiSQORE: in $vocabSequence, Results[]
 * [ ] for each vocab in $vocabSequence
 *      for each result in Results[]
 *          // add other evaluations to soften pruning
 *          if result.vocab > 1
 *              remove vocab from Result.vocab
 * return Results[]
 * [ ] vocab result: combisqore
 * [ ] instance results: all highest scoring results
 */

export function combiSQORE(results: Result[], vocabScores: {[key: string]: number}) {
  const sortedVocabScoreSequence: {[key: string]: number} = sortVocabularyDescScore(vocabScores)
  console.log('🪵  | file: combiSQORE.ts | line 112 | sortedVocabScoreSequence', sortedVocabScoreSequence)
  for (const vocab of Object.keys(sortedVocabScoreSequence)) {
    for (const result of results) {
    }
  }
}


// WIP EXAMPLE USAGE
const defaultOpts = {
	defaultQueryClass: '', // TODO: fill in json file
	defaultQueryProperty: '' // TODO: fill in json file
}
const defaultEndpoint = '' // TODO: fill in default endpoint
const input_query = 'person age size'
const input = input_query.split(' ') 
const results = queryResultsSparql(input, defaultOpts, defaultEndpoint)

// console.log(keys);
// queryResultsSparql(searchTerms);
