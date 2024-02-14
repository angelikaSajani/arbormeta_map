import { getCookie, setCookie } from "typescript-cookie";

import { ViewState_Arbm as ViewState } from "../terriajsOverrides/ViewState_Arbm";

interface TokenResponse {
  token: string;
}

const CSRF_COOKIE_NAME = "csrftoken";

// ---------------------------------------------------------------------------------------------------

export async function getCsrfToken(viewState: ViewState): Promise<string> {
  const resp = await fetchFromAPI(viewState, "auth/getcsrf/");
  const data = await resp.json();
  //@ts-ignore
  return data.token === undefined ? "" : data.token;
}

// ---------------------------------------------------------------------------------------------------

export async function fetchFromAPI(
  viewState: ViewState,
  urlTail: string,
  body: any = null,
  method: string = "GET",
  contentType: string = "application/json",
  enforceCsrf: boolean = false
): Promise<Response> {
  // urlTail should NOT start with a leading slash, and (usually) end with a tailling slash

  if (!viewState.treesAppUrl)
    throw Error(
      "Programming Error: call to fetchFromAPI() without a 'treesAppUrl' being configured."
    );
  const url: string = viewState.treesAppUrl! + urlTail;

  const headers: Record<string, string> = {
    "Content-Type": contentType
  };
  if (enforceCsrf || method == "POST") {
    let crsfToken = getCookie(CSRF_COOKIE_NAME);
    if (!crsfToken) {
      crsfToken = await getCsrfToken(viewState);
      if (!crsfToken)
        throw Error(`Unable to acquire CRSF Token for API call to ${urlTail}`);
      setCookie(CSRF_COOKIE_NAME, crsfToken, {
        sameSite: "None",
        secure: true
      }); // no expiry -> session cookie
    }
    headers["X-CSRFTOKEN"] = crsfToken;
  }

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

  return fetch(url, fetchOptions);
}
