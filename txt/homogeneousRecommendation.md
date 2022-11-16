# Homogeneous Recommendation

The vocabulary-recommender makes suggestions for classes or properties that match a given searchterm by querying a given endpoint. Therefore, this library supports the transformation of traditional data scources into linked data. The vocabulary-recommender can be integrated in various applications, for example to retrieve class- and property suggestions for a CSV-table. When making suggestions per column the result may contain top recommendations for different vocabularies (Schema.org, foaf,...). These vocabularies have a different structure, semantic and host. Therefore, it can be difficult to create and maintain a data model that is based on lots of different vocabularies. It is recommended to keep the amount of used vocabularies as little as possible. To achieve this goal, the vocabulary-recommender provides homogeneous recommendations. That means that it does not only search for classes and properties that match the searchterm but filters the results so that most of the searchterms can be found back in the same vocabularies. 

The searchterms "Person", "knows", "Person" would therefore not result in
```rdf
sdo:Person, foaf:knows, sdo:Person
```
but in 
```rdf
sdo:Person, sdo:knows, sdo:Person
```

## Algorithm

We drew the conclusion to use the state of the art [combiSQORE](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=combiSQORE%3A+An+Ontology+Combination+Algorithm&btnG=) algorithm to perform the homogeneous recommendation. It is based on [SQORE](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=A+Framework+for+Semantic+Query+based+Ontology+Retrieval&btnG=) which can be used for single ontology retrieval. 

### SQORE

SQORE is a Semantic Query based Ontology Retrieval approach that returns a set of best ontologies (the best ontology per query term) based on a semantic query formulated in XML. The semantic query allows users to structurally and semantically express their ontology requirements. This algorithm is not based on machine learning and does not need labeled training data, opposed to most of the state of the art algorithms. 

Furthermore, the semantic query structure can be translated to SPARQL and Elasticsearch, common approaches to query linked data. Semantic queries consist of mandatory and optional requirements which can also be defined by the query languages used for SPARQL and Elasticsearch endpoints. The vocabulary-recommender queries SPARQL- and Elasticsearch endpoints which makes the usage of semantic queries for SQORE very fitting for the vocabulary-recommender. Another benefit of the semantic queries is, that they make it possible to define the users requirements precisly and that it gives the users of this library the possibilty to configure the used queries.

The results that SQORE provides come with a score that describes the similarity between the given query and the queried ontology. This score can be used for ranking and improving the result of combiSQORE as described in the following section.

### combiSQORE

combiSQORE is a simple algorithm for homogeneous recommendation built on SQORE. It computes via SQORE the results for a collection of ontologies and reduces the set of resulting ontologies one by one to find a composition of ontologies that can not be reduced because they would not match the query anymore if done so. The order in which the ontologies are removed from the result set is predetermined and has an impact on the final result. When ordering this sequence of ontologies ascending by the score retrieved from SQORE the resulting ontology sets can be improved. By adding a users preferred ontologies to the end of this sequence the result can also be fitted to the users needs in an easy manner.

Another benefit of combiSQORE is that the retrieved ontology sets always match all the requirements defined in the semantic query. Therefore every result matches the users needs completely. 

In conclusion combiSQORE matches all requirements defined for the vocabulary-recommender:
- suggestions for multiple searchterms
- suggestions that match the given query
- suggestions that can be made based on SPARQL- and Elasticsearch endpoints
- suggestions that include a minimal amount of different vocabularies
