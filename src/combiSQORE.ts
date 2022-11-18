/** TODO:
 * RETRIEVE AND ORDER
 * [x] interfaces: Results
 * [x] searchTerms array from header
 * [x] for each searchTerm, query it with the SPARQL endpoint : Results[]{vocab, url, score}
 * [x] + add score to dict object of distinct vocabs
 * [ ] -> order in desc the names of each vocab $vocabScores && get sorted array of vocabs $vocabSequence
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
 * */

import { result } from "lodash"
import { SparqlResult, sparqlSuggestions } from "./sparql"

interface ReturnedResult{
    category: 'class' | 'property'
    results: Result[]
    vocabularies: { [key: string]: number}
}

interface Result {
    vocabulary: string,
    iri: string,
    score: number
    description: string
} 

const searchTerms : string[] = ['Person', 'horse']
const defaultEndpoint: string = 'https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql'

// TODO: write function that returns the name <string> of the vocabulary
/**
 * @param iri input iri/url of vocabulary
 */
function getVocabulary(iri: string): string {
    throw new Error("Function not implemented.")
}

/** 
 * @param terms array of strings containing the query/search terms
 * @returns Function returns an array of two ReturnedResults objects of Classes and Propberties Result objects and its vocabulary scores
 */
async function queryResultsSparql(terms:string[]): Promise<ReturnedResult[]> {
    const finalClass: Result[] = []
    const finalProperty: Result[] = []
    const finalClassVocabs: { [key: string]: number} = {} // set of vocab terms and relevant score
    const finalPropertyVocabs: { [key: string]: number} = {} // set of vocab terms and relevant score
    for (const term of terms){
        // retieving results for the term for Classes and Properties
        const queryResultClass: SparqlResult[] = await sparqlSuggestions('class', term, defaultEndpoint)
        const queryResultProperty: SparqlResult[] = await sparqlSuggestions('property', term, defaultEndpoint)
        // mapping each result element and appending it to respective Class or Property result array
        queryResultClass.forEach(element => {
            const vocabName: string = getVocabulary(element.iri)
            const result = {
                vocabulary: vocabName,
                iri: element.iri,
                // TODO: sparqlSuggestions is not returning the score
                score: element.score,
                description: element.description
            }
            // add scores to dictionairy
            finalClassVocabs[getVocabulary(element.iri)] = finalClassVocabs[vocabName] + element.score
            // add results to array
            finalClass.push(result)
        })
        queryResultProperty.forEach(element => {
            const vocabName: string = getVocabulary(element.iri)
            const result = {
                vocabulary: vocabName,
                iri: element.iri,
                // TODO: sparqlSuggestions is not returning the score
                score: element.score,
                description: element.description
            }
            // add scores to dictionairy
            finalPropertyVocabs[vocabName] = finalClassVocabs[vocabName] + element.score
            // add results to array
            finalProperty.push(result)
        })
    }
    const c: ReturnedResult = {
        category: 'class',
        results: finalClass,
        vocabularies: finalClassVocabs
    }
    
    const p: ReturnedResult = {
        category: 'property',
        results: finalProperty,
        vocabularies: finalPropertyVocabs
    }

    return [c, p]
}


queryResultsSparql(searchTerms)
