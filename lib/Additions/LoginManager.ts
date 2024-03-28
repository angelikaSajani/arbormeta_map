import { t } from "i18next";

import { LoginData } from "../terriajsOverrides/ViewState_Arbm";
import DjangoComms from "./DjangoComms";
import EncodingUtilities from "./EncodingUtilities";
import { ViewState_Arbm as ViewState } from "../terriajsOverrides/ViewState_Arbm";
import TrustedServers from "terriajs-cesium/Source/Core/TrustedServers";

import {
  DisplayError,
  CustomAuthenticationError,
  CustomNetworkError
} from "./custom-errors";

/**
 * We receive a list of these when retrieving {@link AuthParameters} for a user.
 * By limiting the dongles the user can use to one of these, we effectively prevent the user
 * from creating their own dongles.
 */
interface DongleCredential {
  id: string | Uint8Array; // we receive the ids from Django as base64 encoded, urlsafe strings but require them as Uint8Array
  type: any;
  transport: any;
}

/**
 * The data returned by the Django REST api in response to sending the username
 * containing all the information required to either authenticate either
 * -  by username + password
 * -  by username and authenticator (FIDO2 security key, aka colloquially 'dongle')
 */
interface AuthParameters {
  challenge: string | ArrayBuffer; // string when we receive it from Django, must be b64 decoded and converted to ArrayBuffer before using
  timeout: number;
  rpId: string;
  allowCredentials: DongleCredential[] | []; // Permitted dongles, by using these, user cannot create their own dongle
  userVerification: string;
}

/** Keeps track of whether user has password and or any authenticators (aka dongles).
 *
 * Business logic: users who have any authenticators (even if no longer active)
 * never can log in via password.
 */
interface AuthUserInfo {
  hasAuthenticators: boolean;
  hasPassword: boolean;
}

/** Data about a particular user required while logging in */
export interface AuthData {
  parameters: AuthParameters;
  userInfo: AuthUserInfo;
}

/** Data returned after the authenticator is verified using the browser, that is:
 * the user inserts the dongle if necessary, enters the pin, and touches it.
 */
interface BrowserVerificationResults {
  credentials: object;
  id: string;
  expected_challenge: string;
  expected_rp_id: string;
  expected_origin: string;
}

/** Data required to attempt to log into the Django server.
 *
 * Either `viaDongle` or `viaPassword` must be populated.
 */
export interface LoginCredentials {
  username: string;
  viaDongle?: BrowserVerificationResults;
  viaPassword?: string; // populate with password
}

/** body of the body of an API request to Django to login:
 *
 * All values are strings.
 * `username` must always be populated
 * `app_used` should always be 'terriamap'
 * - if logging in by password, `password` is mandatory
 * - if logging in by dongle, `digest` and `authenticator_id` ae mandatory
 */
interface LoginRequestBody {
  username: string;
  app_used: string;
  password?: string;
  digest?: string;
  authenticator_id?: string;
}

/** Collection of utilities to facility loggin in and out of
 * the Django server.
 */
export default class LoginManager {
  // ================================================================================
  // getUserInfo
  // ================================================================================

  /**
   * Fetch the data (from the Django server) required to log a particula user in.
   * @param username - string
   * @param supportEmail - string
   * @param baseURL - base URL for Django API, MUST end with a slash
   * @param abortSignal - pass a {@link AbortSignal} if the request should be abortable, otherwise null
   * @returns a Promise returning {@link AuthData}, the data required to log a user in either via password or dongle
   * May throw:
   * - {@link CustomAuthenticationError} if the user is either not found, or does not have any credentials to login.
   * - {@link DisplayError} if the user has dongles, but none of them are enabled for this site -> needs to contact customer support
   * - any other *unexpected* {@link CustomNetworkError} if it cannot talk to Django
   */
  public static getUserInfo = async (
    username: string,
    supportEmail: string,
    baseURL: string,
    abortSignal: AbortSignal | null
  ): Promise<AuthData> => {
    const urlTail = `accounts/authenticator_opts/get/${username}/`;
    return DjangoComms.fetchJsonFromAPI(
      baseURL,
      urlTail,
      ["userInfo", "parameters"],
      null,
      { method: "OPTIONS", abortSignal }
    )
      .then((data) => {
        const authData = data! as unknown as AuthData;
        const userInfo = authData.userInfo;
        if (!userInfo.hasAuthenticators && !userInfo.hasPassword) {
          throw new CustomAuthenticationError(
            `User ${username} has neither authentictor nor password.`
          );
        }

        // Normal case...
        if (userInfo.hasAuthenticators) {
          transformAuthData(authData, supportEmail);
        }
        return authData;
      })
      .catch((error) => {
        if (error.name == "NetworkError") {
          const networkError = error as CustomNetworkError;
          if (networkError.statusCode == 404) {
            throw new CustomAuthenticationError(
              `User '${username}' not found.`
            );
          }
        }
        throw error; // re-throw all other errors
      });
  };

  // ================================================================================
  // verifyDongleByBrowser
  // ================================================================================

  /**
   * Takes the AuthData as they have been received from Django (using LoginManager.getUserInfo()),
   * then prompts the user to authenticate the Dongle and returns the result to the caller
   * ### First step (done by the browser):
   *  - let the browser ask the user to use the security key (insert it if necessary, enter pin, then touch it)
   * - this will return null if the user fails to do so, clicks cancel, or the whole process times out
   * ### Second step (our own logic):
   * - check that the result is valid for the challenge we passed.
   *
   * **NOTE**: The data also need to be verified by the Django Server, this will happen in the /auth/login request.
   *
   * @param authData - {@link AuthData}
   * @returns a {@link Promise} returning {@link BrowserVerificationResults}, or `null` if user cancels or lets the dialog time out
   */
  public static verifyDongleByBrowser = async (
    authData: AuthData
  ): Promise<BrowserVerificationResults | null> => {
    // As a third step (later, when trying to login) the server will also verify the credentials)
    try {
      const credentials: Credential | null = await navigator.credentials.get({
        publicKey: authData.parameters as PublicKeyCredentialRequestOptions
      });
      return credentials == null
        ? null
        : LoginManager.verifyExistingCredentialsAgainstChallenge(
            credentials as PublicKeyCredential,
            authData.parameters
          );
    } catch (error) {
      return null;
    }
  };

  // ================================================================================
  // sendLoginRequest
  // ================================================================================

  /**
   * Sends a log in request to the Django-servers api endpoint and returns
   * all relevant data about the user (name, email, flags, permissins)
   * and a session ID for creating a session cookie.
   * Two versions:
   * A) if passing credentials, will attempt to log in with those credentials
   * B) otherwise will use the session Cookie to simply retrieve the details of the
   *    logged in user (if the session is valid and the user is active)
   * The data returned by the request will be identical in both cases.
   * The second version is meant to facilitate the transfer of the logged-in state
   * from the webapp to the terria app when clicking a link.
   * @param baseURL - the base url for the Django-server's API endpoint
   * @param abortSignal - optional (@link AbortSignal) if request should be abortable
   * @param credentials - username and either password or verified authenticator (dongle) data
   */
  public static sendLoginRequest = async (
    baseURL: string,
    abortSignal: AbortSignal | null,
    credentials: LoginCredentials | null
  ): Promise<LoginData> => {
    let body: any = {};
    let endpoint: string;
    if (credentials) {
      const loginRequestBody: LoginRequestBody = {
        username: credentials.username,
        app_used: "terriamap"
      };
      if (credentials.viaDongle) {
        loginRequestBody.digest = JSON.stringify(credentials.viaDongle);
        loginRequestBody.authenticator_id = credentials.viaDongle.id;
      } else {
        loginRequestBody!.password = credentials.viaPassword!;
      }
      body = loginRequestBody;
      endpoint = "auth/login/session/";
    } else {
      endpoint = "auth/login/sessionid/";
    }
    const result = DjangoComms.fetchJsonFromAPI(
      baseURL,
      endpoint,
      ["user", "sessionid"],
      body,
      { method: "POST", abortSignal }
    );
    return result as unknown as LoginData;
  };

  // ================================================================================
  // verifyExistingCredentialsAgainstChallenge
  // ================================================================================

  private static verifyExistingCredentialsAgainstChallenge = (
    credentials: PublicKeyCredential,
    parameters: AuthParameters
  ): BrowserVerificationResults => {
    // Any errors must be signalled

    // verify credentials retrieved via navigator.credentials.get()
    // returns an object that contains everything the server needs to verify the login
    // https://w3c.github.io/webauthn/#sctn-op-get-assertion  section 6.3.3 image at 14

    let assertationResponse: AuthenticatorAssertionResponse =
      credentials.response as AuthenticatorAssertionResponse;
    let clientData = JSON.parse(
      EncodingUtilities.arrayBufferToString(assertationResponse.clientDataJSON)
    );

    let expectedChallenge = new Uint8Array(parameters.challenge as ArrayBuffer); // parameters.challenge is a buffer
    let receivedChallenge = new Uint8Array(
      EncodingUtilities.base64_decode_urlsafe(clientData.challenge)
    );
    if (
      !EncodingUtilities.arraysAreEqual(expectedChallenge, receivedChallenge)
    ) {
      throw new CustomAuthenticationError(
        "Received invalid credentials - wrong challenge."
      );
    }

    // Only the server can validate the signature, because it has the public key.
    // See https://github.com/duo-labs/py_webauthn/blob/master/examples/authentication.py
    // for what the sever needs

    return {
      credentials: {
        id: credentials.id, // already urlsafe_base64 encoded
        rawId: credentials.id, // redundant, but required syntactically
        response: {
          authenticatorData: EncodingUtilities.base64_encode_arrayBuffer(
            assertationResponse.authenticatorData
          ),
          clientDataJSON: EncodingUtilities.base64_encode_arrayBuffer(
            assertationResponse.clientDataJSON
          ),
          signature: EncodingUtilities.base64_encode_arrayBuffer(
            assertationResponse.signature!
          )
        },
        type: credentials.type,
        authenticatorAttachment: credentials.authenticatorAttachment,
        clientExtensionResults: credentials.getClientExtensionResults()
      },
      id: credentials.id, // already urlsafe_base64 encoded
      expected_challenge: EncodingUtilities.base64_encode_arrayBuffer_urlsafe(
        parameters.challenge as ArrayBuffer
      ),
      expected_rp_id: window.location.hostname, // server will also check this against constant BASE_URL
      expected_origin: window.location.protocol + "//" + window.location.host
    };
  };

  // ================================================================================
  // configureTrustedServers
  // ================================================================================

  /**
   * Not directly related to logging in, but only by configuring the TrustedServers
   * will our Django server see the `sessionid` and `csrftoken` cookies.
   * Explanation: see https://github.com/TerriaJS/terriajs/discussions/7055
   *
   * We create extra security by removing the Django Server from the TrustedServers list
   * when logging out -> user cannot simulate logging to get file access just be manually
   * setting a session cookei
   * @param viewState - must be called after terria has started and viewstate.terria is populated
   */
  public static configureTrustedServers = (viewState: ViewState) => {
    const djangoHost = viewState.treesAppHost;
    if (djangoHost) {
      let servers = [
        {
          host: djangoHost.hostname,
          port: djangoHost.port
        }
      ];
      if (djangoHost.hostname === "localhost") {
        servers.push({
          host: "127.0.0.1",
          port: djangoHost.port
        });
      }
      // If somebody is logged in, add to TrustedServers, otherwise remove
      let f = viewState.loginData ? TrustedServers.add : TrustedServers.remove;
      try {
        for (const server of servers) {
          f(server.host, server.port); // add or remove those servers
        }
      } catch {}
    }
  };
} // end of class

// ================================================================================
// transformAuthData
// ================================================================================

// NOTE: moved `transformAuthData` outside of the class,
//       as its declaration as a private static member caused compiler problems

/** Transforms (in place!) the {@link AuthData} from the format in which we receive it from the Django server
 * to the format we need to actually authenticate the user via the dongle.
 * @param authData - {@link AuthData} as we received them from Django (everything is text based)
 * @param supportEmail - string: used to construct an error message that contains a link to customer support
 */
const transformAuthData = (authData: AuthData, supportEmail: string): void => {
  // convert the parameters to the format we need to authenticate
  const parms: AuthParameters = authData.parameters;
  if (parms.allowCredentials.length === 0) {
    throw new DisplayError(
      t("loginPanel.errors.noSecurityKey", {
        email: supportEmail
      })
    );
  }
  parms.challenge = EncodingUtilities.base64_decode_urlsafe(
    parms.challenge as string
  ).buffer;
  for (let allowed of parms.allowCredentials) {
    allowed.id = EncodingUtilities.base64_decode_urlsafe(allowed.id as string);
  }
};
