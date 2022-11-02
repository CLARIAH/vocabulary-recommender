# Reconciliation API Evaluation

*Date: 12/09/2022*

This document assesses the current state of the Reconcillation API found (GitHub Organization Page found [here](https://github.com/reconciliation-api)). 

The [documentation](https://reconciliation-api.github.io/specs/latest/), the GitHub [testbench code](https://github.com/reconciliation-api/testbench), and the [list of service endpoints](https://reconciliation-api.github.io/testbench/#/) provide the context, workings, and examples of this API.

Unfortunately, the setup and in particular the setup for the recommender functions is not well documented ('matching feature' in the [documentation (4.2)](https://reconciliation-api.github.io/specs/latest/#reconciliation-query-responses), e.g. "name_tfidf" or "pagerank").

Regarding the documentation as a whole and the API, it is still incomplete and requires attention as the authors mention:
>'Various aspects of this API need to be improved, as hinted by notes throughout this document.'


The GitHub page seems to be active, although there's no schedule for the next version or when it could be expected:
>July 19 2022: After this release (0.2), our intention is to rework the structure of the API to make it more compliant with the REST principles. This will result in various incompatible changes but should make it easier to implement reconciliation services in modern web frameworks.

*IMPORTANT:* These changes could be problematic due to the ‘various incompatible changes’. This is an issue when the version 0.2 of the API is implemented and the structure of future versions become incompatible. 


### **Background**
The Reconciliation API is a service which originates from OpenRefine services. As written in the documentation:

>'In practice, we can determine if two database records refer to the same entity by comparing their attributes. For instance, two entries about cities bearing the same name, in the same country and with the same mayor are likely to refer to the same city. The reconciliation API that we present here makes it easier to discover such matches. It is a protocol that a data provider can implement, enabling its consumers to efficiently match their own data to the entities represented by the provider.'

All endpoints must enable CORS access, and could enable: JSONP\*, View entities, Suggest entities, Suggest types, Suggest properties, Preview entities, and Extend data (as seen in the table on [the service endpoint list](https://reconciliation-api.github.io/testbench/#/)).

\* JSONP is supported which enables older web-based clients to access the service from a different domain, a malicious endpoint could use JSONP to execute arbitrary JavaScript code.

Another security vulnerability: the ‘Flyout service’ returns a HTML response which could contain malicious code.

### **Querying the service**
Reconciliation queries return a JSON response of candidates with scores. These scores depend on the matching functions used in the API and can be configured when setting up the serviceable endpoint. As mentioned before, the documentation lacks in clearly defining this ranking/matching process.

>'The way candidates are retrieved from the underlying database and scored against the query is left entirely at the discretion of the service. Deciding on a scoring method is one of the main difficulties in developing a reconciliation service.'

## **Evaluation**

### **Evaluation Metrics**

**Maintainability**: cost of configuring a reconciliation endpoint vs SPARQL endpoint.
Costs: implement the Reconciliation API as a service endpoint(https://github.com/reconciliation-api/testbench), set up preferred configs and ranking functions. API might undergo large changes in the foreseeable future (see July 19 2022 quote in the beginning of this document).


**Genericity**: How many can use the service?
Documentation does not mention large use cases. It does mention rate-limiting upon too many requests from one user. Performance is not documented in the documentation nor testbench repository (or on the ‘issues’ page).


**W3C standard or a de facto standard?** 
De facto standard is seemingly the route: 
>'It is not a W3C Standard nor is it on the W3C Standards Track. Please note that under the W3C Community Contributor License Agreement (CLA) there is a limited opt-out and other conditions apply. Learn more about W3C Community and Business Groups.'


**How much support is there for the standard?** 
The API has 5 contributors to the repository, and is still active. Most recent version update was released in July.

**How much adoption is there?**
The API is adopted by a number of service endpoints such as Wikidata (https://reconciliation-api.github.io/testbench/#/). Some of these endpoints work as a service in the test bench (Wikidata’s) and others do not. 


<!-- ### **Evaluation Matrix**

|   |  No Reconciliation API | Reconciliation API + SPARQL/ElasticSearch  | Only Reconciliation API  |
|:---|---|---|---|
| **Configurability**  |  ++ | -  | --  |
| **Standards-compliance**  | ++  | +  | +  |
| **Maintainability**  | ++  | +  | -  |
| **Genericity**  | ++  | +  |  + |
| **Total**  |  8 | 2  | -1  | -->

# Overview & evaluation

The Reconciliation Service API (RSA) is an API (proposal) that unifies the input and output, it does not replace/substitute SPARQL or ES backends, instead it needs such a backends to operate. For this reason, the Evaulation Matrix has been disregarded.

The NDE made a SPARQL implementation for RSA, see this [link](https://github.com/netwerk-digitaal-erfgoed/network-of-terms/tree/master/packages/network-of-terms-reconciliation).

In the future, a CLI tool could be developed that can be used as the front-end of RSA, just like OpenRefine or NDE's Termennetwerk is a front-end. In such a CLI, NDE's SPARQL implementation for RSA could be used to just provide a thin CLI tool with almost no business logic, just arguments passing to the RSA.

Using RSA will greatly benefit other use-cases. One particular useful use-case is for the culturule-heritage sector to clean up their data using OpenRefine using a TriplyDB RSA backed service. Our ETL's become much more simple if the data cleanup and reconciliation process is run outside of a Triply project!