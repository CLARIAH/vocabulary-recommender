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
import { sparqlSuggestions } from "./sparql"

interface ReturnedResult{
    category: 'class' | 'property'
    results: HomoResult[]
    vocabularies: { [key: string]: number}
}

interface HomoResult {
    vocabulary: string,
    iri: string,
    score: number
    description: string
} 

const searchTerms : string[] = ['Person', 'horse']
const defaultEndpoint: string = 'https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql'

// /** 
//  * @param terms array of strings containing the query/search terms
//  * @returns Function returns an array of two ReturnedResults objects of Classes and Propberties Result objects and its vocabulary scores
//  */
// async function queryResultsSparql(terms:string[]): Promise<ReturnedResult[]> {
//     const finalClass: Result[] = []
//     const finalProperty: Result[] = []
//     const finalClassVocabs: { [key: string]: number} = {} // set of vocab terms and relevant score
//     const finalPropertyVocabs: { [key: string]: number} = {} // set of vocab terms and relevant score
//     for (const term of terms){
//         // retieving results for the term for Classes and Properties
//         const queryResultClass: Result[] = await sparqlSuggestions('class', term, defaultEndpoint)
//         const queryResultProperty: Result[] = await sparqlSuggestions('property', term, defaultEndpoint)
//         // mapping each result element and appending it to respective Class or Property result array
//         queryResultClass.forEach(element => {
//             const vocabName: string = getVocabulary(element.iri)
//             const result = {
//                 vocabulary: vocabName,
//                 iri: element.iri,
//                 // TODO: sparqlSuggestions is not returning the score
//                 score: element.score,
//                 description: element.description
//             }
//             // add scores to dictionairy
//             finalClassVocabs[getVocabulary(element.iri)] = finalClassVocabs[vocabName] + element.score
//             // add results to array
//             finalClass.push(result)
//         })
//         queryResultProperty.forEach(element => {
//             const vocabName: string = getVocabulary(element.iri)
//             const result = {
//                 vocabulary: vocabName,
//                 iri: element.iri,
//                 // TODO: sparqlSuggestions is not returning the score
//                 score: element.score,
//                 description: element.description
//             }
//             // add scores to dictionairy
//             finalPropertyVocabs[vocabName] = finalClassVocabs[vocabName] + element.score
//             // add results to array
//             finalProperty.push(result)
//         })
//     }
//     const c: ReturnedResult = {
//         category: 'class',
//         results: finalClass,
//         vocabularies: finalClassVocabs
//     }
    
//     const p: ReturnedResult = {
//         category: 'property',
//         results: finalProperty,
//         vocabularies: finalPropertyVocabs
//     }

//     // TODO: SORT VOCAB SCORE DICTIONAIRY BASED ON SCORE
//     // Step - 1
//     // Create the array of key-value pairs
//     var items = Object.keys(dict).map(
//         (key) => { return [key, dict[key]] });
        
//     // Step - 2
//     // Sort the array based on the second element (i.e. the value)
//     items.sort(
//         (first, second) => { return first[1] - second[1] }
//         );
            
//     // Step - 3
//     // Obtain the list of keys in sorted order of the values.
//     var keys = items.map(
//         (e) => { return e[0] });
    
//     return [c, p]
// }

    
// COMBISCORE IMPLEMENTATION
/**
* IMPLEMENT PRUNING
* [ ] combiSQORE: in $vocabSequence, Results[]
* [ ] for each vocab in $vocabSequence
*      for each result in Results[]
*          // add other evaluations to soften pruning       
*          if result.vocab > 1
*              remove vocab from Result.vocab
*     return Results[]
* [ ] vocab result: combisqore
* [ ] instance results: all highest scoring results
*/

function combiSQORE(vocabSortedSequence:[]){
    for (const vocab of vocabSortedSequence){
        // for (const result of results){

        // }
    }

}


// console.log(keys);
// queryResultsSparql(searchTerms)
