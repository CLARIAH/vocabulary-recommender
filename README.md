# Vocabulary Recommender CLI
The vocabulary recommender CLI provides a recommendation interface which returns relevant Internationalized Resource Identifiers (IRIs) based on the search input. The recommender works with SPARQL or Elasticsearch endpoints which contain relevant vocabulary datasets.

## Installation
### A. When pulling this repository from GitHub:
1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. 
> Run `yarn recommend --help` to see which arguments can be specified.

> An example query would look as follows: `yarn recommend -t person -c class`
> 
&nbsp;

New to yarn? The instructions to download yarn can be found [[here](https://classic.yarnpkg.com/lang/en/docs/install/)]

&nbsp;

### B. When installing the [npm package](https://www.npmjs.com/package/vocabulary-recommender) "vocabulary-recommender":
The npm package can be installed with:  
`yarn add vocabulary-recommender` or `npm i vocabulary-recommender`  

The command `vocabulary-recommender <input arguments>` ONLY works from any directory in terminal when this package is installed **GLOBALLY**!

> **_NOTE:_**: For safety reasons, it's **NOT** recommended to install npm packages globally!  
> But if you wish to have easier access and have a true CLI experience, this can be done with the command:  
`yarn global add vocabulary-recommender`  
> Otherwise, just change directory (cd) to the location where the package was installed. 

&nbsp;

-----------------------
## Configuration files

**Endpoint Configuration:** the endpoint configuration file is generated on first run from the object in `recommend.ts`,  creating the endpoint configuration file. The file is found in the home directory in the *Vocabualry_recommender* folder (use `cd ~/vocabulary_recommender` to go to the folder). 

The configuration file has the following format:
```JSON
{
  defaultEndpoint: "nameOfDefaultEndpoint",
  endpoints: {
    "nameOfDefaultEndpoint": {
      type: "elasticsearch",
      url: "https://api.urlOfEndpoint.nl/",
    },
    "otherEndpointName": {
      type: "sparql",
      url: "https://api.urlOfEndpoint.nl/sparql",
    },
  },
} 
```


In the configuration file `vocabulary-recommender.json`, a default endpoint can be set (from the key name of the endpoint), and endpoints can be specified, providing the endpoint's key **name**, with the key **url** and the key **type** of the endpoint.


You can open this folder in your GUI with terminal with the following command:  
**Linux:**  
`nautilus ~/vocabulary_recommender`  
**Mac:**  
`open ~/vocabulary_recommender`  
**Windows:**  
`start ~/vocabulary_recommender`  
&nbsp;

-------------------
## Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn information. 

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
