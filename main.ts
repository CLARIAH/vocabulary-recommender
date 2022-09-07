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
limit 10`

enum Category {
  class = 'class',
  property = 'property',
}

async function recommend(category: Category, term: string, endpoint: string) {
  const query = CLASS_SEARCH_QUERY
  const request = new URL(endpoint)
  request.search = `query=${encodeURI(query(term))}`
  const fetch = (arg: string) => import('node-fetch')
  const result = await fetch(request.toString())
  /*
    switch (category) {
      case Category.class:
        break;
      case Category.property:
        break;
      default:
        throw Error(`Unanticipated category: ${category}`)
    }
  */
}

async function run() {
  recommend(Category.class, 'person', 'https://api.data.netwerkdigitaalerfgoed.nl/datasets/ld-wizard/sdo/services/sparql/sparql')
  console.log('Hello, world!')
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
