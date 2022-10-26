#!/usr/bin/env node
import fs from 'fs'
import {
  Result,
  assignElasticQuery,
  elasticSuggestions
} from './elasticsearch'
import { assignSparqlQuery, sparqlSuggestions } from './sparql'
import yargs from 'yargs/yargs'
import _ from 'lodash'

// input endpoints
let usedEndpointsType: string[] = []
let usedEndpointsUrl: string[] = []

// Turn endpoint config file into a list of endpoints and:
// concatonate with given CLI argv endpoints if they are not the default endpoints
var file = './conf.json'

if ((!fs.existsSync(file))&&fs.existsSync('./node_modules/vocabulary-recommender/conf.json')){
  file = './node_modules/vocabulary-recommender/conf.json'
}
const confFile = fs.readFileSync(file, 'utf8')
const jsonConfFile = JSON.parse(confFile)
const defaultEndpointName = jsonConfFile.defaultEndpoint
const endpoints = jsonConfFile.endpoints
const endpointNamesFromConfig = Object.keys(endpoints)
const endpointUrls: string[] = []
const endpointTypes: string[] = []
endpointNamesFromConfig.forEach(i => endpointUrls.push(endpoints[i].url))
endpointNamesFromConfig.forEach(i => endpointTypes.push(endpoints[i].type))

if (defaultEndpointName===""){
  throw new Error(`No endpoint for defaultEndpoint provided in config file. Please add a defaultEndpoint from: ${endpointNamesFromConfig}`).message
}

// Run and log results function
async function run () {
  // Waiting for arguments
  const argv = await yargs(process.argv.slice(2)).options({
    searchTerm: {
      alias: 't',
      type: 'array',
      demandOption: true,
      describe: 'Search term used for querying vocabularies'
    },
    category: {
      alias: 'c',
      type: 'array',
      demandOption: true,
      describe: 'Category of IRI, returns either classes or properties',
      choices: ['class', 'property']
    },
    endpoint: {
      alias: 'e',
      type: 'array',
      demandOption: true,
      default:[],
      describe: 'Provide endpoint of the selected service'
    },
    format: {
      alias: 'f',
      type: 'string',
      default: 'text',
      describe: 'Choose output format of the results',
      choices: ['text', 'json']
    },
    verbose: {
      alias: 'v',
      type: 'number',
      count: true,
      describe: 'Show additional information about search query'
    },
    help: {
      alias: 'h'
    }
  }).argv

  for (const i in argv.endpoint){
    if (endpointNamesFromConfig.includes(argv.endpoint[i])){
      // argument is in the config file

      let indexNum = endpointNamesFromConfig.indexOf(argv.endpoint[i])
      usedEndpointsType.push(endpointTypes[indexNum])
      usedEndpointsUrl.push(endpointUrls[indexNum])

    }
    else{
      console.error(`"${argv.endpoint[i]}" is not found in the availble endpoint config file. The default "${defaultEndpointName}" was used instead.\nAvailable endpoint names: ${endpointNamesFromConfig}.\n`)
      let indexNum = endpointNamesFromConfig.indexOf(defaultEndpointName)
      usedEndpointsType.push(endpointTypes[indexNum])
      usedEndpointsUrl.push(endpointUrls[indexNum])
    }
  }

  //  Ensure all elements of arrays are strings
  const searchTerms: string[] = argv.searchTerm.map((term) => term.toString())
  const categories: string[] = argv.category.map((term) => term.toString())

  // Bundle interface used for corresponding searchTerm and category
  interface Bundle {
    searchTerm: string
    category: string
    endpointType: 'sparql' | 'search'
    endpointUrl: string
  }

  if ((searchTerms.length === categories.length) && (searchTerms.length === usedEndpointsType.length)) {
    // zip the two arrays into a nested array with the same index ([a,b,c], [d,e,f] --> [[a,d],[b,e],[c,f]])

    // const zipped: [string | undefined, string | undefined, string | undefined][] = _.zip(searchTerms, categories, usedEndpoints)
    const bundled: Bundle[] = []
    searchTerms.forEach((value, ix) => bundled.push({ 
      searchTerm: value,
      category: categories[ix],
      endpointType: usedEndpointsType[ix] === 'sparql' ? 'sparql' : 'search', // guard
      endpointUrl: usedEndpointsUrl[ix]
      })
    )


    const returnedObjects: {
      searchTerm: string 
      category: string 
      endpoint: string 
      results: Result[] 
  }[] = [] // the final object containing all returnObjects

    // loop over each bundle (searchTerm, category) to find the results with the given endpoints
    for (const bundle of bundled) {
      let results: Result[] = []

      // search for results
      if ((bundle.endpointType) === 'search') {
        const elasticSuggested = await elasticSuggestions(
          bundle.category,
          bundle.searchTerm,
          bundle.endpointUrl
        )
        results = results.concat(elasticSuggested)

        // Log query if verbose level 2
        if (argv.verbose >= 2) {
          console.error(
            JSON.stringify(
              assignElasticQuery(bundle.category, bundle.searchTerm)
            )
          )
        }
      } 
      else if ((bundle.endpointType) === 'sparql') {
        const sparqlSuggested = await sparqlSuggestions(
          bundle.category,
          bundle.searchTerm,
          bundle.endpointUrl
        )
        // adding the results for the current searchTerm and category for the current endpoint
        results = results.concat(sparqlSuggested)

        // Log query
        if (argv.verbose >= 2) {
          console.log(assignSparqlQuery(bundle.category)(bundle.searchTerm))
        }
      } 
      else {
        throw new Error(`${bundle.endpointType}`)
      }

      // object containing the results of the current searchTerm and category for all searched endpoints
      const returnObject: {
        searchTerm: string
        category: string
        endpoint: string
        results: Result[]
      } = {
        searchTerm: bundle.searchTerm,
        category: bundle.category,
        endpoint: bundle.endpointUrl,
        results
      }
      returnedObjects.push(returnObject)
      if (argv.format === 'text') {
        if (argv.verbose >= 1) {
          console.log(
            '--------------------------------------------------------------'
          )
          console.log(
            `searchTerm: ${bundle.searchTerm}\ncategory: ${bundle.category}\nendpoint: ${bundle.endpointUrl}\nResults:\n`
          )
        }
        for (const result of results) {
          if (result.description) {
            console.log(`${result.iri}\nDescription: ${result.description}\n`)
          } else {
            console.log(`${result.iri}\n`)
          }
        }
      }
      if (argv.format == 'json') {
        console.log(JSON.stringify(returnedObjects, null, '\t'))
      }
    }
  } 
  else {
    throw Error(
      `Input array length for searchTerm (${argv.searchTerm.length}), category (${argv.category.length}), and/or endpoints (${argv.endpoint.length}) is not identical, please provide input arrays of the same size`
    )
  }
}


// Start recommender
run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
process.on('uncaughtException', function (err) {
  console.error('Uncaught exception', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})
