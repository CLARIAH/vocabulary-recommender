# Vocabulary Recommender CLI
The vocabulary recommender CLI provides a recommendation interface which returns relevant Internationalized Resource Identifiers (IRIs) based on the search input. The recommender works with SPARQL or Elasticsearch endpoints which contain relevant vocabulary datasets.

## Installation
### A. When pulling this repository from GitHub:
1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. 
> Run `yarn recommend --help` to see which arguments can be specified.

> An example query looks as follows: `yarn recommend -t person -c class`
> 
&nbsp;

New to yarn? The instructions to download and install yarn can be found ([here](https://yarnpkg.com/getting-started/install)). 

&nbsp;

### B. When installing the [npm package](https://www.npmjs.com/package/vocabulary-recommender) "vocabulary-recommender":
The npm package can be installed with:  
`yarn add vocabulary-recommender` or `npm i vocabulary-recommender`  

The command `vocabulary-recommender <input arguments>` only works from any directory in terminal when this package is installed globally!

> **_NOTE_**: For safety reasons, it is **NOT** recommended to install npm packages globally!  
> But if you wish to have easier access and have a true CLI experience, this can be done with the command:  
`yarn global add vocabulary-recommender`  
> Otherwise, just change directory (cd) to the location where the package was installed. 

&nbsp;

-----------------------
## Configuration files

**Endpoint Configuration:** The endpoint configuration file `conf.json` is created during the first run of the vocabulary recommender and saved in the project directory.

The configuration file has the following format:
```json
{
  defaultEndpoint: "defaultkey",
  defaultQueryClass: "defaultQueryClass.rq",
  defaultQueryProperty: "defaultQueryProperty.rq",
  defaultQueryESClass: "./queries/defaultESClass.json",
  defaultQueryESProperty: "./queries/defaultESProp.json",
  endpoints: {
    "defaultkey": {
      type: "elasticsearch",
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

In the configuration file, a default endpoint can be set using the key name of the endpoint, and endpoints can be specified, providing the endpoints key **name**, with the key **url** and the key **type** of the endpoint.

To specify the endpoint(s) that is used, add the -e flag and the endpoint name to the input command:

`yarn recommend -t person -c class -e otherkey`

When no endpoint is specified the default endpoint is used automatically. When the amount of endpoint is less than the amount of search terms the default endpoint is used for the rest of the search terms.

`yarn recommend -t person -c class` -> `defaultkey` is queried.
`yarn recommend -t person knows -c class property -e otherkey` -> `otherkey` is queried for the search term 'person'. `defaultkey` is used for the search term 'knows'.

**Query Configuration:**  
Four default queries must be specified: **defaultQueryClass**, **defaultQueryProperty**, **defaultQueryESClass** and **defaultQueryESProperty**. It is also possible to specify specific configured queries under the **queryClass** and **queryProperty** keys. The query corresponding to the set category (**class** / **property**) is selected automatically according to the configuration. The SPARQL queries should be stored in a rq-file and should contain the searchterm `${term}` in the following format:

```sql
select ?iri ?desc ?score where {
    filter(regex(str(?iri),'${term}','i'))
    ?iri dct:description ?desc .
}   
```

SPARQL queries must always return the variable **iri** and **score** and should be stored in a file with the RQ format. Elasticsearch queries must always return the **_id** and the **_score** which are retrieved by using `bool` queries. They should be stored in a json file.

The results always return the same information that the query returns. That means that our previous example would not only return the iri and the score but also the description.

**Vocabulary Configuration**
You can also configure your preferred vocabularies. When calling the `homogeneousRecommendation()` function, you can input a dictionary with your preferred vocabularies. The key is the prefix of the vocabulary. The value is a number which indicates how important the vocabulary is.

```ts
{
  "prefix1": 10,
  "prefix2": 15
}
```

-------------------
## Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn information.

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
