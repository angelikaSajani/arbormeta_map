import { ViewState_Arbm as ViewState } from "../terriajsOverrides/ViewState_Arbm";

// ---------------------------------------------------------------------------------------------------
// This section deals with issues relating to domain names and cookies
// in regard to the DjangoApp and this app working will together.
// ---------------------------------------------------------------------------------------------------

export const KNOWN_DOMAIN_NAMES = ["arbormeta.earth", "arbormeta.world"];

/**
 * @param givenDomain
 * @result If `givenHostName` contains one of the known host names
 *         it returns that known host name prefixed by .
 *         This is the required syntax for specifying the domain
 *         for a cookie that is to be shared between a main domain and subdomain
 *         (i.e. 'arbormeta.earth' and 'db.arbormeta.earth')
 *         Otherwise it returns `givenHostName`, which likely is 'localhost' or an ip-address
 */
export function getCookieDomain(givenHostName: string): string {
  for (let oneDomain of KNOWN_DOMAIN_NAMES) {
    if (givenHostName.includes(oneDomain)) return "." + oneDomain;
  }
  return givenHostName;
}

/**
 * @param givenDomain
 * @result If `givenHostName` contains one of the known host names
 *         it returns that known host name, which is the main domain (without any subdomain prefixes).
 */
export function getMainDomain(givenHostName: string): string {
  for (let oneDomain of KNOWN_DOMAIN_NAMES) {
    if (givenHostName.includes(oneDomain)) return oneDomain;
  }
  return givenHostName;
}

// ---------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

/**
 * Returns true if the two uris refer to the same host.
 * To be regarded as same they must have the same protocol, hostname, and port number
 * Port numbers can be explicit or implicit (ie 80 for http, 443 for https)
 * so "http://abc:80" will be regarded as identical to "http://abc"
 * @param uri1
 * @param uri2
 */
export function compareUris(uri1: string, uri2: string): boolean {
  if (!uri1 || !uri2) return false;

  const url1 = new window.URL(uri1);
  const url2 = new window.URL(uri2);

  const port1 = url1.port
    ? parseInt(url1.port)
    : url1.protocol === "https"
    ? 443
    : 80;
  const port2 = url2.port
    ? parseInt(url2.port)
    : url2.protocol === "https"
    ? 443
    : 80;

  return (
    url1.protocol === url2.protocol &&
    url1.hostname === url2.hostname &&
    port1 === port2
  );
}

// ---------------------------------------------------------------------------------------------------

export function sessionStorageNotDefined(key: string): boolean {
  const data = sessionStorage.getItem(key);
  return (
    data === undefined ||
    data === null ||
    data === "undefined" ||
    data === "null" ||
    data === "[object Object]" ||
    data === ""
  );
}

// ----------------------------------------------------------------------------------------

export function sessionStorageDefined(key: string): boolean {
  return !sessionStorageNotDefined(key);
}

// ----------------------------------------------------------------------------------------

export function loadFromSession(key: string, type: string | null = null): any {
  // If type is null (the default) the content loaded from sessionStorage is parsed as JSON.
  // If type is NOT null, it should be 'string', 'int', 'float', or 'boolean'
  //  In those cases the result will not be parsed from JSON, but
  //  automatic conversion from text (if necessary) will happen

  const item: string | null = sessionStorage.getItem(key);
  if (type === null) {
    if (item === null) {
      return null;
    }
    try {
      return JSON.parse(item);
    } catch {
      console.warn(`Could not parse JSON from session storage, key: '${key}'`);
      return null;
    }
  } else {
    const itemType = typeof item;
    switch (type) {
      case "int":
        return itemType === "string" ? parseInt(item!) : item;
      case "float":
        return itemType === "string" ? parseFloat(item!) : item;
      case "string":
        let result = itemType === "string" ? item! : "" + item;
        if (result === "null") return null;
        return result;
      case "boolean":
        return itemType === "string"
          ? parseBool(item!)
          : itemType === "number"
          ? //@ts-ignore
            item != 0
          : item;
      default:
        console.warn(`loadFromSession('${key}', '${type}'): unsupported type!`);
        return item;
    }
  }
} // loadFromSession()

// ----------------------------------------------------------------------------------------

export function parseBool(val: any): boolean {
  return (
    val === true ||
    val === 1 ||
    val === "1" ||
    (typeof (val === "string") && val.toLowerCase() === "true")
  );
}
