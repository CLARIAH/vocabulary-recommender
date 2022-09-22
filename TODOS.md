# Todo list:

- [x] rename elasticSearch.ts to elasticsearch.ts
- [x] console.log change: 'Sparql OR Elasticsearch suggestions:' to 'Suggestions:'
- [x] remove `yarn build &&` from welcome
- [x] CLI welcome message: from STDOUT to STDLOG
  > done with `console.error(message)` - not the nicest but it works
- [x] use a const object for the in-code IRIs that are used. `const rdf = {type: 'http://www w3 org/1999/02/22-rdf-syntax-ns#type',}`
  > **(!!!)** The implementation broke the code - reverted to previous version for the elasticsearch.ts file

- [x] make `--term`/`-t` required argument
- [x] add `-h` help as alias for `--help`
- [x] no flags? --> output help message
- [x] combine intro & help message for intro?
  > not possible - should be possible with `yargs.showHelp()`, but does not work. Print current help (?)
- [x] add `-q` to print the query containing the searchTerm
- [x] {feature} detect endpoint automatically (no need for service flag if implemented)
- [ ] {feature} list as input for queries
- [ ] {feature} list as input for endpoints

## Review:

- [ ] @Mark code review for best practices 🕵️‍♂️
- [ ] Make NPM package available! 🥳
