# Vocabulary Recommender CLI
The vocabulary recommender CLI provides a recommendation interface which returns related Internationalized Resource Identifiers (IRIs) based on the search input. These recommendations work with SPARQL or Elasticsearch endpoints, containing the relevant vocabulary datasets.

## Installation

1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. Run `yarn recommend --help` to see which arguments can be specified.

### Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn info. 

To avoid this, run the script directly with node: `node ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
