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

**Endpoint Configuration:** 

The endpoint configuration file `vocabulary-recommender.json` is created during the first run of the vocabulary recommender and saved in the <ins>current working directory</ins> in the ***'vocabulary_recommender'*** folder (use terminal command `pwd` to see the working directory). 

The configuration file has the following format:
```JSON
{
  defaultEndpoint: "defaultkey",
  endpoints: {
    "defaultkey": {
      type: "elasticsearch",
      url: "https://api.endpoint.nl/",
    },
    "otherkey": {
      type: "sparql",
      url: "https://api.endpoint.nl/sparql",
    },
  },
} 
```


In the configuration file, a default endpoint can be set using the key name of the endpoint, and endpoints can be specified, providing the endpoints key **name**, with the key **url** and the key **type** of the endpoint.

-------------------
## Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn information. 

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
