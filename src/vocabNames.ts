// import execAll  from 'execall'
import { Arguments, ReturnObject } from './interfaces'
import { recommend } from './recommend'
import { fetch } from 'cross-fetch'

// Fetches the lov endpoint and returns the vocabulary prefixes and their corresponding IRIs.
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
/*
getVocabNames() returns the name of the vocabulary for an iri or an empty string if no vocabulary name could be found .
Input
    prefixes: prefixes and their corresponding IRIs, can be fetched with getPrefixes()
    iri: The IRI for which the vocabulary name is found.
    slice: Indicates whether the last part of the iri (e.g. 'Person') should be sliced off.
*/
export async function getVocabName(prefixes: any, iri: string, slice: boolean) {
    // vocabName contains the returned vocabulary name.
    let vocabName: string = ''
    // vocabIri contains the Iri for which the prefix is searched. 
    let vocabIri = iri
    if (slice){
        // Extracts the vocabulary iri from the given iri
        // https://schema.org/Person -> https://schema.org/
        vocabIri = iri.match(/(.*[\\/\\#:])(.*)$/)![1]
    }
    for ( const prefix of prefixes["results"]["bindings"] ){
        if ( prefix['vocabURI']['value'] === vocabIri ) {
            // Store the lov-prefix as vocabName if the extracted vocabIri matches the lov-Iri
            vocabName = prefix['vocabPrefix']['value']
        }
    }
    // Sometimes, the last part of the iri contains a '/' or '#'
    // http://www.w3.org/ns/person#Person -> http://www.w3.org/ns/person#
    if (vocabName === '' && vocabIri != '') {
        // Remove the '/' or '#' and try again.
        vocabName = await getVocabName(prefixes, vocabIri.slice(0,-1), false)
    }
    return vocabName
}