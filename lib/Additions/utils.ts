import { getCookie, setCookie } from "typescript-cookie";

import { ViewState_Arbm as ViewState } from "../terriajsOverrides/ViewState_Arbm";
import {
  CustomTimeoutError,
  CustomNetworkError,
  CustomAbortError
} from "./custom-errors";

const CSRF_COOKIE_NAME = "csrftoken";

// ---------------------------------------------------------------------------------------------------

// Function to sanitize and escape HTML
export const sanitizeHTML = (input: string): string => {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.body.textContent || "";
};

// ---------------------------------------------------------------------------------------------------

export async function getCsrfToken(
  viewState: ViewState,
  signal: AbortSignal | null
): Promise<string> {
  const resp = await fetchFromAPI(viewState, signal, "auth/getcsrf/");
  const data = await resp.json();
  //@ts-ignore
  return data.token === undefined ? "" : data.token;
}

// ---------------------------------------------------------------------------------------------------

// export async function fetchJsonFromAPI(
//   viewState: ViewState,
//   abortSignal: AbortSignal | null,
//   urlTail: string,
//   body: any = null,
//   method: string = "GET",
//   timeout: number = 10 * 1000, // milliseconds
//   enforceCsrf: boolean = false
// ): Promise<any> {
//   debugger;
// }

// ---------------------------------------------------------------------------------------------------

export async function fetchFromAPI(
  viewState: ViewState,
  abortSignal: AbortSignal | null,
  urlTail: string,
  body: any = null,
  method: string = "GET",
  timeout: number = 10 * 1000, // milliseconds
  contentType: string = "application/json",
  enforceCsrf: boolean = false
): Promise<Response> {
  // urlTail should NOT start with a leading slash, and (usually) end with a tailling slash

  if (!viewState.treesAppUrl)
    throw Error(
      "Programming Error: call to fetchFromAPI() without a 'treesAppUrl' being configured."
    );
  const url: string = viewState.treesAppUrl! + urlTail;

  // Create a combined signal (abort or timeout), whatever happens first
  let signals: AbortSignal[] | [] = [];
  if (abortSignal) {
    //@ts-ignore
    signals.push(abortSignal);
  }
  if ("any" in AbortSignal && "timeout" in AbortSignal && timeout > 0) {
    //@ts-ignore
    signals.push(AbortSignal.timeout(timeout));
  }
  //@ts-ignore
  const combinedSignal: AbortSignal = AbortSignal.any(signals);

  // build the headers
  const headers: Record<string, string> = {
    "Content-Type": contentType
  };

  // For POST requests to work we generally need a csrf token in the headers
  // This is stored in a cookie, if we haven't got it yet we have to request one.
  if (enforceCsrf || method == "POST") {
    let crsfToken = getCookie(CSRF_COOKIE_NAME);
    if (!crsfToken) {
      crsfToken = await getCsrfToken(viewState, combinedSignal);
      if (!crsfToken)
        throw Error(`Unable to acquire CRSF Token for API call to ${urlTail}`);
      setCookie(CSRF_COOKIE_NAME, crsfToken, {
        sameSite: "None",
        secure: true
      }); // no expiry -> session cookie
    }
    headers["X-CSRFTOKEN"] = crsfToken;
  }

  // Build the remaining options
  let fetchOptions: RequestInit = {
    method: method,
    credentials: "include",
    cache: "no-cache",
    mode: "cors",
    headers: headers
  };
  if (body !== null) {
    fetchOptions.body = JSON.stringify(body);
  }
  if (combinedSignal !== null) {
    fetchOptions.signal = combinedSignal;
  }

  let response: Response;
  // Make special provisions to catch timout and abort
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (combinedSignal.aborted) {
      let errorName = combinedSignal.reason.name; // combinedSignal.reason is a DOMExceptionyarn
      if (errorName == "TimeoutError")
        throw new CustomTimeoutError(
          "The Django server is not responding. Check you network connections, and try again later."
        );
      if (errorName == "AbortError") throw new CustomAbortError("Aborted."); // this error should never be shown to the user
    }
    throw error; // re-throw any other errors
  }

  if (!response.ok) {
    const statusCode = response.status;
    const statusText = response.statusText;
    throw new CustomNetworkError(response.status, response.statusText);
  }

  return response;
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
