// import execAll  from 'execall'
import { Arguments, ReturnObject } from './interfaces'
import { recommend } from './recommend'
import { fetch } from 'cross-fetch'

export async function getPrefixes(){
    const query = `
    PREFIX vann:<http://purl.org/vocab/vann/>
    PREFIX voaf:<http://purl.org/vocommons/voaf#>
     
    ### Vocabularies contained in LOV and their prefix
    SELECT DISTINCT ?vocabPrefix ?vocabURI {
         GRAPH <https://lov.linkeddata.es/dataset/lov>{
              ?vocabURI a voaf:Vocabulary.
              ?vocabURI vann:preferredNamespacePrefix ?vocabPrefix.
    }}`
    
    const request = new URL("https://lov.linkeddata.es/dataset/lov/sparql");
    request.search = `query=${encodeURI(query)}`;

    const result = await fetch(request.toString(), {
      method: "GET",
    });

    if (result.ok) {
        /*
	    "results": {
		    "bindings": [
		        {
			        "vocabPrefix": {
				        "type": "literal",
				        "value": "eac-cpf"
			        },
			        "vocabURI": {
				        "type": "uri",
				        "value": "http://archivi.ibc.regione.emilia-romagna.it/ontology/eac-cpf/"
			        }
		        },
            ]
        }
            */
        return await result.json();

    } else {
        throw Error("Fetching the lov-URL to retrieve the vocabulary names returned bad results.");
    }
}

// getVocabNames() returns the name of the vocabulary for an iri or an empty string if no vocabulary name could be found
export async function getVocabName(prefixes: any, iri: string, slice: boolean) {
    // vocabName contains the return vocabulary name
    let vocabName: string = ''
    // vocabIri contains the Iri for which a prefix is searched 
    let vocabIri = iri
    if (slice){
        // Extracts the namespace of the iri
        vocabIri = iri.match(/(.*[\\/\\#:])(.*)$/)![1]
    }
    for ( const prefix of prefixes["results"]["bindings"] ){
        if ( prefix['vocabURI']['value'] === vocabIri ) {
            // Store the lov-prefix as vocabName if the extracted namespaces matches the lov-namespace
            vocabName = prefix['vocabPrefix']['value']
        }
    }
    // Sometimes, the last part of the iri contains a '/' or '#'
    // http://www.w3.org/ns/person#Person
    // Vocabulary: http://www.w3.org/ns/person#
    if (vocabName === '' && vocabIri != '') {
        // Remove the '/' or '#' and try again
        vocabName = await getVocabName(prefixes, vocabIri.slice(0,-1), false)
    }
    return vocabName
}