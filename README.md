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

**SPARQL Query Configuration:**  
When using SPARQL endpoints two default SPARQL queries can be assigned to retrieve classes or properties, the **defaultQueryClass** and the **defaultQueryProperty**. For SPARQL endpoints, it is also possible to specify specific configured SPARQL queries under the **queryClass** and **queryProperty** keys. The query corresponding to the set category (**class** / **property**) is selected automatically according to the configuration. The SPARQL queries should be stored in a rq-file and should contain the searchterm `${term}` in the following format:

```sql
select ?iri ?desc where {
    filter(regex(str(?iri),'${term}','i'))
    ?iri dct:description ?desc .
}   
```

The results return the same information that the SPARQL query returns. Therefore, the example would return the iri and the description. 


-------------------
## Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn information. 

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
