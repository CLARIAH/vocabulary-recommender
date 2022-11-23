### Pseudo Code Recommender function

This document describes the recommender function that is stored in recommend.ts in pseudo code.

Input:
argv: Arguments -> Interface
    -> list of searchTerms
    -> list of categories
    -> list of endpoints: [{ name, type, url, queryClass?, queryProp? }]
    -> default endpoint

Output:
returnedObjects: ReturnObject[]
    -> List of return objects that consist of
        -> searchTerm
        -> category
        -> endpoint
        -> Result[]: [{ iri, optional: additional information },{},..]

If the same amount of searchTerms and categories are given...
    ... and no endpoints are provided: use default endpoint
    ... and the same amount of endpoints are provided: use given endpoints
    ... and more endpoints are provided: throw an error and exit
    ... and less endpoints are provided: use given endpoints and fill them up with default endpoints until the amount of endpoints is the same as the amount of searchTerms and categories.

bundled: Bundle[]
    -> List of bundles that consist of the corresponding
        -> searchTerm
        -> category
        -> endpoint type (= search/sparql)
        -> endpoint url
        -> endpoint query

For each bundle of bundled:
    Call the functions sparqlSuggested(category, searchTerm, endpointUrl, query) or elasticSuggested(category, searchTerm, endpointUrl) according to the endpoint type.
    results: Store the results in a list of Results
    returnObject: ReturnObject
        -> searchTerm: bundle.searchTerm
        -> category: bundle.category
        -> endpoint: bundle.endpointUrl
        -> results: results
    Add returnObject to the list of returnedObjects

Return returnedObjects
