
interface EndpointUrl {
  url: string;
  instance: string;
  account: string;
  dataset: string;
  service: string;
  endpointservice: string;
}

/**
 * Extracts endpoint URL information and returns object
 * @param url - endpoint url of format: https://api.INSTANCE/datasets/ACCOUNT/DATASET/services/SERVICE/
 * @returns an object with url items as keys
 */
export function splitUrl(url: string): EndpointUrl | undefined {
  const regexp =
    /((https?):\/\/(\w+)\.(.+\.\w+))\/(datasets)\/(.+)\/(.+)\/(services)\/(.+)\/(\w+)/g;
  const match = regexp.exec(url);
  if (match) {
    const url = match[1];
    const INSTANCE = match[4];
    const ACCOUNT = match[6];
    const DATASET = match[7];
    const SERVICE = match[9];
    const ENDPOINTSERVICE = match[10];

    const final: EndpointUrl = {
      url: url,
      instance: INSTANCE,
      account: ACCOUNT,
      dataset: DATASET,
      service: SERVICE,
      endpointservice: ENDPOINTSERVICE,
    };
    // console.log(final);

    return final;
  } else {
    console.error("Invalid input - no matches found");
  }
}