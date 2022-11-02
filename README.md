# Vocabulary Recommender CLI
The vocabulary recommender CLI provides a recommendation interface which returns relevant Internationalized Resource Identifiers (IRIs) based on the search input. The recommender works with SPARQL or Elasticsearch endpoints which contain relevant vocabulary datasets.

## Installation
### When pulling this repository from GitHub:
1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. 
> Run `yarn recommend --help` to see which arguments can be specified.

> An example query would look as follows: `yarn recommend -t person -c class`
> 
&nbsp;

New to yarn? The instructions to download yarn can be found [[here](https://classic.yarnpkg.com/lang/en/docs/install/)]

&nbsp;

### When installing the [npm package](https://www.npmjs.com/package/vocabulary-recommender) "vocabulary-recommender":
The npm package can be installed with:  
`yarn add vocabulary-recommender` or `npm i vocabulary-recommender`  

&nbsp;


When first running the npm package, a folder named "vocabulary-recommender" will be generated in the home directory, containing the configuration file for endpoints (.vocabulary-recommender.json). You can edit this file to add your own endpoints and set up a different default endpoint.

You can open this folder in terminal with the following command:  
**Linux:**  
`nautilus ~/vocabulary-recommender`  
**Mac:**  
`open ~/vocabulary-recommender`  
**Windows:**  
`start ~/vocabulary-recommender`  
&nbsp;

The command `vocabulary-recommender <input arguments>` works when this package is installed *globally*.

> **Note**: it's NOT recommended to install npm packages globally!
But if you wish to have easier access and have a true CLI experience, this can be done with the command:  
`yarn global add vocabulary-recommender`  

Otherwise, just change directory (cd) to the location where the package was installed.
## Output as JSON
Because of the use of yarn, using `yarn recommend <searchTerm> <category> <endpoint> -f json > example.json` will create a json file that does not have the right syntax due to the added yarn information. 

To avoid this behavior, run the script directly with node: `node --no-warnings ./dist/recommend <searchTerm> <category> <endpoint> -f json > example.json`
