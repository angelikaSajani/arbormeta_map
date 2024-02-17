import { t } from "i18next";

import {
  ViewState_Arbm as ViewState,
  LoginData
} from "../terriajsOverrides/ViewState_Arbm";
import DjangoComms from "./DjangoComms";
import EncodingUtilities from "./EncodingUtilities";
import {
  DisplayError,
  CustomAuthenticationError,
  CustomNetworkError
} from "./custom-errors";

/**
 * The data returned by the Django REST api in response to sending the username
 * containing all the information required to either authenticate either
 * -  by username + password
 * -  by username and authenticator (FIDO2 security key, aka colloquially 'dongle')
 */

interface DongleCredential {
  id: string | Uint8Array; // we receive the ids from Django as base64 encoded, urlsafe strings but require them as Uint8Array
  type: any;
  transport: any;
}

interface AuthParameters {
  challenge: string | ArrayBuffer; // string when we receive it from Django, must be b64 decoded and converted to ArrayBuffer before using
  timeout: number;
  rpId: string;
  allowCredentials: DongleCredential[] | []; // Permitted dongles, each will contain 'id', 'type' and 'transport', 'id' must be b64 decoded to Uint8Array before using
  userVerification: string;
}

interface AuthUserInfo {
  hasAuthenticators: boolean;
  hasPassword: boolean;
}

interface BrowserVerificationResults {
  credentials: object;
  id: string;
  expected_challenge: string;
  expected_rp_id: string;
  expected_origin: string;
}

interface LoginCredentials {
  username: string;
  viaDongle?: BrowserVerificationResults;
  viaPassword?: string;
}

/** body of the body of an API request to Django to login:
 *
 * All values are strngs.
 * `username` must always be populated
 * - if logging in by password, `password` is mandatory
 * - if logging in by dongle, `digest` and `authenticator_id` ae mandatory
 */
interface LoginRequestBody {
  username: string;
  password?: string;
  digest?: string;
  authenticator_id?: string;
}

interface LoginRequestResult {
  user: object;
  sessionid;
  string;
  digest?: string;
  authenticator_id?: string;
}
/** Data about a particular user required while logging in */
export interface AuthData {
  parameters: AuthParameters;
  userInfo: AuthUserInfo;
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
   * @param viewState - {@link ViewState}
   * @param signal - pass a {@link AbortSignal} if the request should be abortable, otherwise null
   * @returns a Promise returning {@link AuthData}, the data required to log a user in either via password or dongle
   * May throw:
   * - {@link CustomAuthenticationError} if the user is either not found, or does not have any credentials to login.
   * - {@link DisplayError} if the user has dongles, but none of them are enabled for this site -> needs to contact customer support
   * - any other *unexpected* {@link CustomNetworkError} if it cannot talk to Django
   */
  public static getUserInfo = async (
    username: string,
    viewState: ViewState,
    signal: AbortSignal | null
  ): Promise<AuthData> => {
    const urlTail = `accounts/authenticator_opts/get/${username}/`;
    return DjangoComms.fetchJsonFromAPI(
      viewState,
      signal,
      urlTail,
      ["userInfo", "parameters"],
      null,
      "OPTIONS"
    )
      .then((data) => {
        const userInfo = data.userInfo;
        if (!userInfo.hasAuthenticators && !userInfo.hasPassword) {
          throw new CustomAuthenticationError(
            `User ${username} has neither authentictor nor password.`
          );
        }

        // Normal case...
        if (userInfo.hasAuthenticators) {
          LoginManager.transformAuthData(data, viewState.terria.supportEmail);
        }
        return data as AuthData;
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
  // transformAuthData
  // ================================================================================

  /** Transforms (in place!) the {@link AuthData} from the format in which we receive it from the Django server
   * to the format we need to actually authenticate the user via the dongle.
   * @param authData - {@link AuthData} as we received them from Django (everything is text based)
   * @param supportEmail - string: used to construct an error message that contains a link to customer support
   */
  private static transformAuthData = (
    authData: AuthData,
    supportEmail: string
  ): void => {
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
      allowed.id = EncodingUtilities.base64_decode_urlsafe(
        allowed.id as string
      );
    }
  };

  // ---------------------------------------------------------------------------------------------------

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

  public static sendLoginRequest = async (
    viewState: ViewState,
    signal: AbortSignal | null,
    credentials: LoginCredentials
  ): Promise<LoginData> => {
    const loginRequestBody: LoginRequestBody = {
      username: credentials.username
    };
    if (credentials.viaDongle) {
      debugger;
      loginRequestBody.digest = JSON.stringify(credentials.viaDongle);
      loginRequestBody.authenticator_id = credentials.viaDongle.id;
    } else {
      loginRequestBody.password = credentials.viaPassword!;
    }
    return DjangoComms.fetchJsonFromAPI(
      viewState,
      signal,
      "auth/login/session/",
      ["user", "sessionid"],
      loginRequestBody,
      "POST"
    );
  };
}
