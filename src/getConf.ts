import fs from "fs";
import { endpointConfigurationObject } from "./recommend";

var file = ".vocabulary-recommender.json";
if (!fs.existsSync(file) &&
  !fs.existsSync("~/Vocabulary_recommender/.vocabulary-recommender.json")) {
  const configObject = JSON.stringify(endpointConfigurationObject);
  fs.mkdirSync("~/Vocabulary_recommender");
  fs.writeFileSync(
    "~/Vocabulary_recommender/.vocabulary-recommender.json",
    configObject
  );
  file = "~/Vocabulary_recommender/.vocabulary-recommender.json";
} else if (!fs.existsSync(file) &&
  fs.existsSync("~/Vocabulary_recommender/.vocabulary-recommender.json")) {
  file = "~/Vocabulary_recommender/.vocabulary-recommender.json";
}
const confFile = fs.readFileSync(file, "utf8");
const jsonConfFile = JSON.parse(confFile);
export const defaultEndpointName = jsonConfFile.defaultEndpoint;
export const defaultQueryClass = jsonConfFile.defaultQueryClass;
const defaultQueryProp = jsonConfFile.defaultQueryProperty;
const endpoints = jsonConfFile.endpoints;
export const endpointNamesFromConfig = Object.keys(endpoints);
export const endpointUrls: string[] = [];
export const endpointTypes: string[] = [];
// List containing the names of the files where the configured queries are stored.
export const sparqlFiles: string[] = [];
endpointNamesFromConfig.forEach((i) => endpointUrls.push(endpoints[i].url));
endpointNamesFromConfig.forEach((i) => endpointTypes.push(endpoints[i].type));
// Make a decision between queryClass and queryProperty
endpointNamesFromConfig.forEach((i) => sparqlFiles.push(endpoints[i].defaultQueryClass));
