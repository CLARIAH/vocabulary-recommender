import { Endpoint, ReturnedResult, Input } from "./interfaces";
import { singleRecommendation } from "./singleRecommend";

/**
 * Function that can be used for different applications to recommend vocabularies homogeneously.
 * It returns two results:
 * - homogeneous recommendations that focus on the individual scores of the search results.
 * - homogeneous recommendations that focus on the vocabulary scores.
 *
 *  @param argv list of input objects
 *  @param defaultEndpoint used when no endpoint is specified
 *  @param confVocabs preferred vocabularies and their scores.
 *  @returns List containing the homogeneous recommendations with focus on the individual scores and the homogeneous recommendations with focus on the vocabulary scores.
 */
export async function homogeneousRecommendation(
  argv: Input[],
  defaultEndpoint: Endpoint,
  confVocabs: { [key: string]: number }
): Promise<ReturnedResult[][]> {
  // Get the recommendation results.
  const recommended = await getSingles(argv, defaultEndpoint);

  // Get the vocabulary scores for the vocabularies that appear in the results.
  const vocabScores = getVocabScores(recommended);

  // Add the configured score to the score that has been computed by the results.
  for (const vocab of Object.keys(confVocabs)) {
    if (Object.keys(vocabScores).includes(vocab)) {
      vocabScores[vocab] = +vocabScores[vocab] + +confVocabs[vocab];
    }
  }

  // Sort the vocabularies in ascending order.
  const vocabSequence: string[] = Object.keys(vocabScores).sort(
    (second, first) => (vocabScores[second] || -1) - (vocabScores[first] || -1)
  );

  // combiSQORE result
  const combiResult: string[] = combiSQORE(vocabSequence, recommended, 0, []);

  // Homogeneous recommendations that focus on the individual scores of the search results.
  const instanceRecommendation: ReturnedResult[] = [];
  // Homogeneous recommendations that focus on the vocabulary scores.
  const vocabRecommendation: ReturnedResult[] = [];
  // Get the homogeneous recommendations for each searchTerm
  for (const index in recommended) {
    // Adds one result per searchTerm
    instanceRecommendation.push(
      getInstanceRecommendation(recommended[index], combiResult)
    );
    // Add the configured json object as single results if possible, otherwise add the normal results.
    instanceRecommendation[index].single = recommended[index].single
      ? recommended[index].single
      : recommended[index].homogeneous;
    vocabRecommendation.push(
      getVocabRecommendation(recommended[index], combiResult, vocabScores)
    );
    vocabRecommendation[index].single = recommended[index].single
      ? recommended[index].single
      : recommended[index].homogeneous;
  }
  return [instanceRecommendation, vocabRecommendation];
}

/**
 * Returns the homogeneous recommendation for the highest instance scores.
 * 
 * @param searchObj results for the searchTerm
 * @param combiResult combiSQORE result
 * @returns instance with the highest individual score whose vocabulary is also included in the combiResult.
 *  */ 
function getInstanceRecommendation(
  searchObj: ReturnedResult,
  combiResult: string[]
): ReturnedResult {
  // Sort the results by score
  searchObj.homogeneous.sort(
    (first, second) => (second.score || -1) - (first.score || -1)
  );
  // Add the searchTerm to the result object
  const instResult: ReturnedResult = {
    searchTerm: searchObj.searchTerm,
    vocabs: [],
    homogeneous: [],
  };
  // Search for the result with the highest score that is part of one of the combiSQORE vocabularies.
  for (const result of searchObj.homogeneous) {
    if (combiResult.includes(result.vocabulary)) {
      instResult.homogeneous.push(result);
      instResult.vocabs.push(result.vocabulary);
      return instResult;
    }
  }
  return instResult;
}

/**
 * Returns the homogeneous recommendation for the highest vocabulary score.
 * 
 * @param searchObj results for the searchTerm
 * @param combiResult combiSQORE result
 * @param vocabScores vocabulary scores
 * @returns instance with the highest vocabulary score.
 *  */ 
function getVocabRecommendation(
  searchObj: ReturnedResult,
  combiResult: string[],
  vocabScores: {
    [key: string]: number;
  }
): ReturnedResult {
  // Sort the results by score
  searchObj.homogeneous.sort(
    (first, second) => (second.score || -1) - (first.score || -1)
  );
  // Initialize the resulting object
  const vocResult: ReturnedResult = {
    searchTerm: searchObj.searchTerm,
    vocabs: [],
    homogeneous: [],
  };
  // Sort the combiSQORE vocabularies by their score
  combiResult.sort((first, second) => vocabScores[second] - vocabScores[first]);
  for (const vocab of combiResult) {
    for (const result of searchObj.homogeneous) {
      if (result.vocabulary === vocab) {
        vocResult.homogeneous.push(result);
        vocResult.vocabs.push(vocab);
        return vocResult;
      }
    }
  }
  return vocResult;
}

/**
 * Reduces the possible vocabularies to a small list of needed vocabularies.
 * 
 * @param vocabSequence vocabularies sorted from lowest to highest
 * @param recommended single recommendations
 * @param index current position in the vocabSequence
 * @param currentResult current combiSQORE result
 * @returns vocabularies that are needed to find a result for every searchTerm.
 *  */ 
function combiSQORE(
  vocabSequence: string[],
  recommended: ReturnedResult[],
  index: number,
  currentResult: string[]
): string[] {
  // recommended vocabs without the current vocab in the vocabSequence
  const woVocab: ReturnedResult[] = [];

  // Loop through the search objects
  for (const listItem of recommended) {
    // Create a result list without the current vocab
    woVocab.push({
      searchTerm: listItem.searchTerm,
      vocabs: listItem.vocabs.filter((item) => item != vocabSequence[index]),
      homogeneous: listItem.homogeneous,
    });
  }
  for (const woListItem of woVocab) {
    // Check if one of the lists gets empty without the current vocabulary
    if (woListItem.vocabs.length === 0) {
      // Add the needed vocab to the combiResult
      if (!currentResult.includes(vocabSequence[index])) {
        currentResult.push(vocabSequence[index]);
      }
      // Go to the next vocabulary
      if (index < vocabSequence.length - 1) {
        combiSQORE(vocabSequence, recommended, index + 1, currentResult);
      }
    }
  }
  // Go to the next vocabulary without adding it to the result list.
  if (!currentResult.includes(vocabSequence[index])) {
    if (index < vocabSequence.length - 1) {
      combiSQORE(vocabSequence, woVocab, index + 1, currentResult);
    }
  }
  return currentResult;
}

/**
 * Gets the recommended results and prepares them for the combiSQORE function.
 *
 *  @param inputList searchterms and configurations for the search
 *  @param defaultEndpoint endpoint that is used if no endpoint has been specified
 *  @returns list of the single results and the vocabularies in the results
 */
async function getSingles(
  inputList: Input[],
  defaultEndpoint: Endpoint
): Promise<ReturnedResult[]> {
  // Get the single recommendations
  const recommended = await singleRecommendation(inputList, defaultEndpoint);

  // Initialize the returned object
  const resultList: ReturnedResult[] = [];
  // Add the searchTerms to the returned object.
  for (const input of inputList) {
    resultList.push({
      searchTerm: input.searchTerm,
      vocabs: [],
      homogeneous: [],
    });
  }
  // Loop through the returned objects.
  // There is one listItem per result with the corresponding results and vocabularies.
  for (const listItem of resultList) {
    for (const returnObj of recommended) {
      if (returnObj.searchTerm === listItem.searchTerm) {
        // Add the class and property results
        listItem.homogeneous.push(...returnObj.results);
        listItem.single?.push(returnObj.addInfo);
        for (const result of returnObj.results) {
          if (!listItem.vocabs.includes(result.vocabulary)) {
            // Make a list of distinct vocabularies that are contained in the search results.
            listItem.vocabs.push(result.vocabulary);
          }
        }
      }
    }
  }
  /**
   * [
   *   {searchTerm: "loves", vocabs: ["sor"], results: [{iri:,...}], addInfo: {...}},
   *   {searchTerm: "human", vocabs: ["foaf", "sdo"], results: [{iri:,...}, {iri:..}], addInfo: {...}},
   * ]
   */
  return resultList;
}

/** Returns a dictionary of the vocabularies in the results and their vocabulary scores.
 * @param recommended single recommendations for each searchTerm
 * @returns dictionary with the vocabularies and their scores
 *  */ 
function getVocabScores(recommended: ReturnedResult[]): {
  [key: string]: number;
} {
  // Dictionary with the vocabName and the score
  let vocabScores: { [key: string]: number } = {};
  // Dictionary that counts the appearance of each vocabulary
  let vocabCounts: { [key: string]: number } = {};
  // Loop through every search object
  for (const listItem of recommended) {
    // Get the result for the current searchTerm
    for (const result of listItem.homogeneous) {
      // If the vocabulary is contained in the vocabScore dictionary
      if (Object.keys(vocabScores).includes(result.vocabulary)) {
        // Add the scores up
        vocabScores[result.vocabulary] =
          +vocabScores[result.vocabulary] + +(result.score || 0.01);
        // Raise the count by one
        vocabCounts[result.vocabulary] = +vocabCounts[result.vocabulary] + +1;
      } else {
        // initialize the score and the count for this vocab
        vocabScores[result.vocabulary] = result.score || 0.01;
        vocabCounts[result.vocabulary] = 1;
      }
    }
  }

  // Normalize the vocab scores
  for (const vocab in vocabCounts) {
    vocabScores[vocab] = vocabScores[vocab] / vocabCounts[vocab];
  }
  return vocabScores;
}
