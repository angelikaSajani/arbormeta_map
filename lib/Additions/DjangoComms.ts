import { getCookie, setCookie } from "typescript-cookie";
import JsonValue from "terriajs/lib/Core/Json";

import {
  CustomTimeoutError,
  CustomAbortError,
  CustomNetworkError,
  CustomInvalidResponse
} from "./custom-errors";

/**
 * - method: http verb, default 'GET'
 * - abortSignal: {@link AbortSignal}, default null
 * - timeout: in milliseconds, default 10 seconds, pass <= 0 for no timeout
 * - contentType: default 'application/json'
 * - enforceCsrf: enforce sending of Csrf header even if method is not 'POST'
 * - cacheMode: default 'no-cache'
 */
interface DjangoFetchOptions {
  method?: string;
  abortSignal?: AbortSignal | null;
  timeout?: number;
  contentType?: string;
  enforceCsrf?: boolean;
  cacheMode?: string;
}

/** The `DjangoComms` class provides a collection of low-level utilities to communicate with the Django Server
 * Use this class to
 * - fetch data (in particular JSON)
 * - request a CSRF token
 */
export default class DjangoComms {
  private static CSRF_COOKIE_NAME = "csrftoken";
  private static CSRF_HEADER_NAME = "X-CSRFTOKEN";

  private static DEFAULT_OPTIONS = {
    method: "GET",
    abortSignal: null,
    timeout: 10 * 1000, // milliseconds
    contentType: "application/json",
    enforceCsrf: false,
    cacheMode: "no-cache"
  };

  // -------------------------------------------------------------------------------------
  /** Mid-level method to communicate with the Django Server
   * @param baseURL - Base URL to the Django API, should have trailing slash
   * @param abortSignal - A {@link AbortSignal} instance, or null (if aborting the request is not needed)
   * @param urlTail - Must contain the api endpoint to be appended to the base api URL (should NOT start with a leading slash, and (usually) end with a tailling slash)
   * @param requiredKeys - Array of required keys that must be present in the response, default empty; **only** useful if response is object
   * @param body - Either an object that can be stringified by JSON, or null
   * @param method - Http verb, default 'GET'
   * @param timeout - Timeout in milliseconds, default 10 seconds; if <= 0 request will not time out
   * @param contentType - String to be passed in header `Content-Type`, default `application/json`
   * @param enforceCsrf - Default false, to enforce passing a `CSRF_HEADER_NAME` for requests other than POST (for POST requests the header is passed automatically)
   * @returns - A {@link Promise} returning a an object or array as parsed from a json response
   * Requires that `treesAppUrl` is configured.
   * ### May throw
   *  - {@link CustomTimeoutError}    if the request times out
   *  - {@link CustomAbortError}      if the request was aborted (i.e. user clicks cancel, component unmounts)
   *  - {@link CustomNetworkError}    if the Response does *not* contain all of the `requiredKeys`
   *  - {@link CustomInvalidResponse} if the Response returned is not ok (status other than 2xx)
   *  - any other unexpected errors ({@link Error})
   */
  public static fetchJsonFromAPI = async (
    baseURL: string,
    urlTail: string,
    requiredKeys: string[] | [],
    body: any = null,
    options: DjangoFetchOptions
  ): Promise<JsonValue> => {
    return DjangoComms.fetchFromAPI(baseURL, urlTail, body, options)
      .then((resp) => resp.json())
      .then((data) => {
        for (const key of requiredKeys) {
          if (!(key in data)) {
            throw new CustomInvalidResponse(
              `Invalid response to '${urlTail}'`,
              key,
              data
            );
          }
        }
        return data;
      });
  };

  // -------------------------------------------------------------------------------------
  /** Low level method to communicate with the Django Server
   * @param baseURL - Base URL to the Django API, should have trailing slash
   * @param abortSignal - A {@link AbortSignal} instance, or null (if aborting the request is not needed)
   * @param urlTail - Must contain the api endpoint to be appended to the base api URL (should NOT start with a leading slash, and (usually) end with a tailling slash)
   * @param body - Either an object that can be stringified by JSON, or null
   * @param options -
   *
   * - method - Http verb, default 'GET'
   * - timeout - Timeout in milliseconds, default 10 seconds; if <= 0 request will not time out
   * - contentType - String to be passed in header `Content-Type`, default `application/json`
   * - enforceCsrf - Boolean, default false, to enforce passing a `CSRF_HEADER_NAME` for requests other than POST (for POST requests the header is passed automatically)
   * @returns - A {@link Promise} returning a {@link Response}
   * Requires that `treesAppUrl` is configured.
   * ### May throw
   *  - {@link CustomTimeoutError} if the request times out
   *  - {@link CustomAbortError}   if the request was aborted (i.e. user clicks cancel, component unmounts)
   *  - {@link CustomNetworkError} if the Response returned is not ok (status other than 2xx)
   *  - any other unexpected errors ({@link Error})
   */
  public static fetchFromAPI = async (
    baseURL: string,
    urlTail: string,
    body: any = null,
    options: DjangoFetchOptions
  ): Promise<Response> => {
    if (!baseURL)
      throw Error(
        "Programming Error: call to fetchFromAPI() without a 'treesAppUrl' being configured."
      );

    const url: string = baseURL! + urlTail;
    const _options: DjangoFetchOptions = {
      ...DjangoComms.DEFAULT_OPTIONS,
      ...options
    };

    let combinedSignal = _options.abortSignal!;
    if (DjangoComms.canUseTimouts()) {
      // Create a combined signal (abort or timeout), whatever happens first
      let signals: AbortSignal[] | [] = [];
      if (_options.abortSignal) {
        //@ts-ignore
        signals.push(_options.abortSignal);
      }
      if (_options.timeout! > 0) {
        //@ts-ignore
        signals.push(AbortSignal.timeout(_options.timeout!));
      }
      if (signals.length > 1) {
        //@ts-ignore
        combinedSignal = AbortSignal.any(signals);
      } else if (signals.length == 1) {
        combinedSignal = signals[0];
      }
    }

    // build the headers
    const headers: Record<string, string> = {
      "Content-Type": _options.contentType!
    };

    // For POST requests to work we generally need a csrf token in the headers
    // This is stored in a cookie, if we haven't got it yet we have to request one.
    if (_options.enforceCsrf || _options.method! == "POST") {
      const djangoDomain = DjangoComms.getDjangoDomain(baseURL);
      let cookieOptions = {
        sameSite: "None",
        secure: true,
        domain: djangoDomain.includes("arbormeta.earth")
          ? ".arbormeta.earth"
          : djangoDomain
      };
      console.log(`cookieOptions.domain: ${cookieOptions.domain}`);

      let crsfToken = getCookie(DjangoComms.CSRF_COOKIE_NAME);
      if (!crsfToken) {
        crsfToken = await DjangoComms.getCsrfToken(baseURL, combinedSignal);
        if (!crsfToken)
          throw Error(
            `Unable to acquire CRSF Token for API call to ${urlTail}`
          );
        //@ts-ignore
        setCookie(DjangoComms.CSRF_COOKIE_NAME, crsfToken, cookieOptions); // no expiry -> session cookie
      }
      headers[DjangoComms.CSRF_HEADER_NAME] = crsfToken;
    }

    // Build the remaining options
    let fetchOptions: RequestInit = {
      method: _options.method!,
      credentials: "include", // necessary for sending the csrf and session cookies if present
      //@ts-ignore
      cache: _options.cacheMode!,
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
      throw new CustomNetworkError(response.status, response.statusText);
    }

    return response;
  };

  // -------------------------------------------------------------------------------------
  /** Returns the value of a CSRF token from the Django server
   * @param baseURL - Base URL to the Django API, should have trailing slash
   * @param abortSignal - A {@link AbortSignal} instance, or null (if aborting the request is not needed)
   * @returns - A {@link Promise} returning a string, which may be empty if the request is unsuccessful
   * ### What do we need a CSRF token for:
   * Such a token is required for all POST requests from the Django server and in such requests
   * must
   * 1) exist as a cookie `CSRF_COOKIE_NAME`
   * 2) be passed in the header `CSRF_HEADER_NAME`
   * ### Rationale for this method:
   * Cookies in the client **cannot** be set in the client via xhr requests, that is a security
   * limitation determined by the protocol for the fetch command.
   * Thus the value of the cookie must be sent in the body of a get request, and it's up to the client
   * (the caller of this method, to set the cookie).
   * ### Also
   * @see {@link DjangoComms.fetchFromAPI} for possible errors thrown.
   */
  private static getCsrfToken = async (
    baseURL: string,
    abortSignal: AbortSignal | null
  ): Promise<string> => {
    const resp = await DjangoComms.fetchFromAPI(
      baseURL,
      "auth/getcsrf/",
      null,
      { abortSignal }
    );
    const data = await resp.json();
    //@ts-ignore
    return data.token === undefined ? "" : data.token;
  };

  // -------------------------------------------------------------------------------------
  /**
   *
   * @returns true if the browswer supports both AbortSignal.any() and AbortSignal.timout()
   * Safari atm does not. Chrome does
   */
  private static canUseTimouts = (): Boolean => {
    //@ts-ignore
    return (
      //@ts-ignore
      typeof AbortSignal.any === "function" &&
      //@ts-ignore
      typeof AbortSignal.timeout === "function"
    );
  };

  // -------------------------------------------------------------------------------------
  private static getDjangoDomain = (baseUrl: string): string => {
    const url = new window.URL(baseUrl);
    return url.hostname;
  };
}
