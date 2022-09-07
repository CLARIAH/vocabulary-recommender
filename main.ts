const CLASS_SEARCH_QUERY = (term: string) => `prefix owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
select distinct ?iri ?description {
  {
    # Support both OWL and RDFS classes.
    {
      ?iri a owl:Class.
    } union {
      ?iri a rdfs:Class.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
    # Prefer classes that match with the search term.
    filter(
      regex(str(?description), "${term}", "i") ||
      # Sometimes IRIs contain substring that can be used to filter.
      regex(str(?iri), "${term}", "i") ||
      regex(str(?label), "${term}", "i"))
  } union {
    # Since the above regex match is relatively crude,
    # also return a tail of arbitrary classes.
    {
      ?iri a owl:Class.
    } union {
      ?iri a rdfs:Class.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
  }
}
limit 1`

const PREDICATE_SEARCH_CONFIG = (term: string) => `prefix owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
select distinct ?iri ?description {
  {
    # Support both OWL and RDF properties.
    {
      ?iri a owl:DatatypeProperty.
    } union {
      ?iri a owl:ObjectProperty.
    } union {
      ?iri a rdf:Property.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
    # Prefer classes that match with the search term.
    filter(
      regex(str(?description), "${term}", "i") ||
      # Sometimes IRIs contain substring that can be used to filter.
      regex(str(?iri), "${term}", "i") ||
      regex(str(?label), "${term}", "i"))
  } union {
    # Since the above regex match is relatively crude,
    # also return a tail of arbitrary properties.
    {
      ?iri a rdf:Property.
    } union {
      ?iri a owl:DatatypeProperty.
    } union {
      ?iri a owl:ObjectProperty.
    }
    ?iri
      rdfs:comment ?description;
      rdfs:label ?label.
  }
}
limit 1`

enum Category {
  class = 'class',
  property = 'property',
}


interface SparqlResult {
  iri: string
  resource: string
}

function assignQuery(category: Category) {
  if(category === Category.class) {
    return  CLASS_SEARCH_QUERY
  } else if (category === Category.property) {
    return PREDICATE_SEARCH_CONFIG
  } else {
    throw Error('Category does not exist! Please provide existing category.')
  }
}

async function suggestions(category: Category, term: string, endpoint: string) { 
  const query = assignQuery(category)
  const request = new URL(endpoint)
  request.search = `query=${encodeURI(query(term))}`
  const fetch = require('node-fetch')
  const result = await fetch(request.toString())

  
  if (result.ok) { 
    const json: any = await result.json()
    const sparqlResults: SparqlResult[] = []
    for(let row of json) {
      const rowResults: any = {}
      for (const key of Object.keys(row)) {
        if (row[key]) {
          rowResults[key] = row[key]
        }
      }
      sparqlResults.push(rowResults)
    }
    return sparqlResults
  } else {
    throw Error('Fetching the URL returned bad results.')
  }
}


async function run() {
  const category = Category.class
  const searchTerm = 'person'
  const endpoint = 'https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql'
  const suggested = suggestions(category, searchTerm, endpoint)
  console.log(`This is what you were looking for:\ncategory: ${category},\nsearchTerm: ${searchTerm},\nendpoint: ${endpoint}\n\n`)
  console.log(`\n\n`)
  console.log(await suggested)
}
run().catch(e => {
  console.error(e)
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
