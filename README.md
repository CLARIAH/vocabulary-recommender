# Old Vocabulary Recommender

A generic vocabulary recommender library that provides recommendation functions for various backends implemented with a CLI.

**This branch contains older features of main that were removed:**
* multiple endpoints for input
  * feature would query all endpoints per searchterm + category and return the set of results => now it only queries one endpoint per searchterm + category
* welcome message with session.log file
* verbose query flag

## Installation

1. Run `yarn` to install the dependencies.
2. Run `yarn build` to generate the JavaScript code.
3. Run `yarn recommend` to run the JavaScript code. Run `yarn recommend --help` to see which arguments can be specified.
