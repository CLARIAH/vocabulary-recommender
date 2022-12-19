# Vocabulary Recommender Command-line interface (CLI)
The vocabulary recommender CLI provides a recommendation interface which returns relevant Internationalized Resource Identifiers (IRIs) based on the search input. It works with SPARQL or Elasticsearch endpoints which contain relevant vocabulary datasets.

# Homogeneous recommendations
The vocabulary recommender supports multiple search terms. The algorighm minimizes the number of vocabularies required for a set of recommendations. For example, the result `sdo:Person` `sdo:knows` would be preferred above `sdo:Person` `foaf:knows`, because the former only requires one vocabulary, whereas the latter requires two. A comprehensive [literature study](docs/homogeneousRecommendation.md) has been conducted to find a suitable algorithm, which resulted in using [combiSQORE](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=combiSQORE%3A+An+Ontology+Combination+Algorithm&btnG=). 

# Installation
## A. When pulling this repository from GitHub:
1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. 
> Run `yarn recommend --help` to see which arguments can be specified.

> An example query looks as follows: `yarn recommend -t person -c class`
> 
&nbsp;

New to yarn? The instructions to download and install yarn can be found ([here](https://yarnpkg.com/getting-started/install)). 

&nbsp;

## B. When installing the [npm package](https://www.npmjs.com/package/vocabulary-recommender) "vocabulary-recommender":
The npm package can be installed with: 
`yarn add vocabulary-recommender` or `npm i vocabulary-recommender` 

The command `vocabulary-recommender <input arguments>` only works from any directory in terminal when this package is installed globally!

> **_NOTE_**: For safety reasons, it is **NOT** recommended to install npm packages globally! 
> But if you wish to have easier access and have a true CLI experience, this can be done with the command: 
`yarn global add vocabulary-recommender` 
> Otherwise, just change directory (cd) to the location where the package was installed. 

&nbsp;

# Configuration 
## Configuration file
The configuration file `conf.json` is created during the first run of the vocabulary recommender and saved in the project directory. It has the following format: 

```json
{
  defaultEndpoint: "defaultkey",
  defaultQueryClass: "defaultQueryClass.rq",
  defaultQueryProperty: "defaultQueryProperty.rq",
  defaultQueryESClass: "./queries/defaultESClass.json",
  defaultQueryESProperty: "./queries/defaultESProp.json",
  endpoints: {
    "defaultkey": {
      type: "search",
      url: "https://api.endpoint.nl/",
    },
    "otherkey": {
      type: "sparql",
      url: "https://api.endpoint.nl/sparql",
      queryClass: "configuredQueryClass.rq",
      queryProperty: "configuredQueryProperty.rq",
    },
  },
} 
```

**Endpoint Configuration:** 
In the configuration file, endpoints can be specified by providing the endpoints key **name**, together with the key **url** and the key **type** of the endpoint. A default endpoint can be set using the key **name** of the endpoint.

To specify the endpoint(s) that is/are used, add the `-e` flag and the endpoint name to the input command:

`yarn recommend -t person -c class -e otherkey`

When no endpoint is specified, the default endpoint is used automatically. When the number of endpoints is less than the number of search terms, the default endpoint is used for the rest of the search terms.

`yarn recommend -t person -c class` -> `defaultkey` is queried.
`yarn recommend -t person knows -c class property -e otherkey` -> `otherkey` is queried for the search term 'person'. `defaultkey` is used for the search term 'knows'.


**Query Configuration:** 
Four default queries must be specified: **defaultQueryClass**, **defaultQueryProperty**, **defaultQueryESClass** and **defaultQueryESProperty**. It is also possible to specify specific configured queries under the **queryClass** and **queryProperty** keys. The query corresponding to the set category (**class** / **property**) is selected automatically according to the configuration. The SPARQL queries should be stored in a file with the extension `.rq` and should contain the searchterm `${term}` in the following format:

```sql
select ?iri ?desc ?score where {
  filter(regex(str(?iri),'${term}','i'))
  ?iri dct:description ?desc .
}
```

SPARQL queries must always return the variables **iri** and **score**. Elasticsearch queries must always return the **_id** and the **_score** which are retrieved by using `bool` queries. They should be stored in a `.json` file.

The results always return the same information that the query returns. That means that our previous example would not only return the iri and the score but also the description. 

## **Preferred vocabularies configuration** 

You also configure a preference ordering of vocabularies by passing a dictionary with your preferred vocabularies as a parameter when calling the `homogeneousRecommendation()` function. The key is the prefix of the vocabulary, and the value represents the importance of the vocabulary. Internally, the preference ordering works by exploiting the fact that the ordering of vocabularies influences the result of the combiSQORE algorithm that has been chosen for the vocabulary recommender. 

```ts
{
  "prefix1": 10,
  "prefix2": 15
}
```

# Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the correct syntax due to the added yarn information.

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
