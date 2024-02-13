import { TFunction } from "i18next";
import React from "react";
import { observer } from "mobx-react";
import { withTranslation, WithTranslation } from "react-i18next";
import { DefaultTheme, withTheme } from "styled-components";

import Button from "terriajs/lib/Styled/Button";
import Box from "terriajs/lib/Styled/Box";
import Text from "terriajs/lib/Styled/Text";
import Spacing from "terriajs/lib/Styled/Spacing";
import Input from "terriajs/lib/Styled/Input";
import withTerriaRef from "terriajs/lib/ReactViews/HOCs/withTerriaRef";
import MenuPanel from "terriajs/lib/ReactViews/StandardUserInterface/customizable/MenuPanel";
import Styles from "./login-panel.scss";

import {
  ViewState_Arbm as ViewState,
  LoginData
} from "../../terriajsOverrides/ViewState_Arbm";

import { fetchFromAPI } from "../utils";

import {
  base64_decode_urlsafe,
  base64_encode_arrayBuffer_urlsafe,
  arrayBufferToString,
  base64_encode_arrayBuffer,
  arraysAreEqual
} from "./utils";

type Modus = "typing" | "loading";
type LoginStep =
  | "typingUsername"
  | "loadingUser"
  | "typingPassword"
  | "authenticatingPassword"
  | "authenticatingDongle";

interface PropTypes extends WithTranslation {
  viewState: ViewState;
  refFromHOC?: React.Ref<HTMLDivElement>;
  theme: DefaultTheme;
  t: TFunction;
}

interface LoginRequestBody {
  username: string;
  password?: string;
  digest?: string;
  authenticator_id?: string;
}

interface BrowserVerificationResults {
  credentials: object;
  id: string;
  expected_challenge: string;
  expected_rp_id: string;
  expected_origin: string;
}

// The data sent by the back-end api in response to sending the username
// containing all the information required to either authenticate either
// -  by username + password
// -  by username and authenticator (FIDO2 security key, aka colloquially 'dongle')

interface AuthParameters {
  challenge: string | ArrayBuffer; // string when we receive it from Django, must be b64 decoded and converted to buffer before using
  timeout: number;
  rpId: string;
  allowCredentials: [object]; // each will contain 'id', 'type' and 'transport', 'id' must be b64 decoded to Uint8Array before using
  userVerification: string;
}

interface AuthUserInfo {
  hasAuthenticators: boolean;
  hasPassword: boolean;
}

interface AuthData {
  parameters: AuthParameters;
  userInfo: AuthUserInfo;
}

interface LoginPanelState {
  isOpen: boolean;
  username: string;
  password: string;
  modus: Modus;
  authData: AuthData | undefined;
  error: string;
}

const INITIAL_STATE: LoginPanelState = {
  isOpen: false,
  username: "",
  password: "",
  modus: "typing",
  authData: undefined,
  error: ""
};

//@ts-ignore
@observer
class LoginPanel extends React.Component<PropTypes, LoginPanelState> {
  viewState?: ViewState;
  keyListener: (e: any) => void;

  constructor(props: PropTypes) {
    super(props);

    this.keyListener = (e) => {
      if (e.key === "Escape") {
        this.onDismiss();
      } else if (e.key === "Enter") {
        // Map to hitting the button only if currently typing, and what is being typed is not empty
        // If user is typing, they are either typing username, or password
        if (this.state.modus !== "typing") return;
        const currentStep: LoginStep = this.getLoginStep();
        // determine function to call, and value to test for non-emptyness
        const [f, value] =
          currentStep == "typingUsername"
            ? [this.fetchUser, this.state.username]
            : [this.tryLogin, this.state.password];
        if (value) {
          f();
        }
      }
    };

    this.state = { ...INITIAL_STATE };
  }

  componentDidMount = () => {
    window.addEventListener("keydown", this.keyListener, true);
  };

  componentWillUnmount = () => {
    window.removeEventListener("keydown", this.keyListener, true);
  };

  private resetState = () => {
    this.setState({ ...INITIAL_STATE });
  };

  private onDismiss = () => {
    this.resetState();
  };

  private changeOpenState = (open: boolean) => {
    const wasOpen = this.state.isOpen;
    this.setState({ isOpen: open });
    if (!wasOpen && open) {
      this.focus("username");
    } else if (wasOpen && !open) {
      this.resetState();
    }
  };

  private storeAuthData = (
    authData: AuthData | undefined,
    error: string | null = null
  ) => {
    this.setState({ authData: authData });
    if (error !== null) {
      this.setState({ error: error });
    }
  };

  closePanel = () => {
    this.changeOpenState(false);
    this.setState({ error: "" });
  };

  private focus = (whichInput: "username" | "password") => {
    setTimeout(() => {
      const elInput: HTMLInputElement | null = document.querySelector(
        "input." + whichInput
      );
      if (elInput) {
        elInput.focus();
      }
    }, 100);
  };

  private updateUsername = (username: string, error: string | null = null) => {
    this.setState({ username: username });
    if (error !== null) {
      this.setState({ error: error });
    }
  };

  private updatePassword = (password: string, error: string | null = null) => {
    this.setState({ password: password });
    if (error !== null) {
      this.setState({ error: error });
    }
  };

  private updateModus = (newModus: Modus, error: string | null = null) => {
    this.setState({ modus: newModus });
    if (error !== null) {
      this.setState({ error: error });
    }
    const newStep = this.calcLoginStep(newModus, this.state.authData); // calculate what it will be after modus is updated
    if (newStep == "typingPassword") {
      this.focus("password");
    }
  };

  private calcLoginStep(
    modus: Modus,
    authData: AuthData | undefined
  ): LoginStep {
    if (modus == "typing") {
      return authData === undefined ? "typingUsername" : "typingPassword";
    } else {
      return authData === undefined
        ? "loadingUser"
        : authData.userInfo.hasAuthenticators
        ? "authenticatingDongle"
        : "authenticatingPassword";
    }
  }

  private getLoginStep = (): LoginStep => {
    const modus: Modus = this.state.modus;
    const authData: AuthData | undefined = this.state.authData;
    return this.calcLoginStep(modus, authData);
  };

  private onKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    currentStep: LoginStep
  ) => {
    if (e.key == "Enter") {
      const [f, value] =
        currentStep == "typingUsername"
          ? [this.fetchUser, this.state.username]
          : [this.tryLogin, this.state.password];
      if (value) {
        f();
      }
    }
  };

  private fetchUser = async () => {
    this.updateModus("loading", "");

    const viewState = this.props.viewState;
    const urlTail =
      "accounts/authenticator_opts/get/" + this.state.username + "/";
    return fetchFromAPI(viewState, urlTail, null, "OPTIONS")
      .then((resp) => resp.json())
      .then((data) => {
        // handle errors even if we get a response
        const errorMsg = data.detail; // if i.e. the user cannot be found, the error message will be in 'detail'
        if (errorMsg) throw new Error(errorMsg);
        if (data.userInfo === undefined || data.parameters === undefined) {
          console.error(
            "Invalid response from Django server to api/v1/accounts/authenticator_opts/get/:"
          );
          console.error(data);
          throw new Error("Server Error");
        }

        if (data.userInfo.hasAuthenticators || data.userInfo.hasPassword) {
          if (data.userInfo.hasAuthenticators) {
            // convert the parameters to the format we need to authenticate
            const parms = data.parameters;
            if (parms.allowCredentials.length === 0) {
              throw new Error(
                "You do not have any valid secirity keys, please contact the site administrator."
              );
            }
            parms.challenge = base64_decode_urlsafe(parms.challenge).buffer;
            for (let allowed of parms.allowCredentials) {
              allowed.id = base64_decode_urlsafe(allowed.id);
            }
          }
          this.storeAuthData(data);
          if (data.userInfo.hasAuthenticators) {
            this.tryLogin();
          } else {
            this.updateModus("typing", ""); // -> will see the section where user can enter pasword
          }
        } else {
          this.updateModus(
            "typing",
            `User ${this.state.username} has neither authentictor nor password.`
          );
        }
      })
      .catch((error) => {
        this.updateModus("typing", error.message);
      });
  };

  private verifyExistingCredentialsAgainstChallenge = (
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
      arrayBufferToString(assertationResponse.clientDataJSON)
    );

    let expectedChallenge = new Uint8Array(parameters.challenge as ArrayBuffer); // parameters.challenge is a buffer
    let receivedChallenge = new Uint8Array(
      base64_decode_urlsafe(clientData.challenge)
    );
    if (!arraysAreEqual(expectedChallenge, receivedChallenge)) {
      throw new Error("Received invalid credentials - wrong challenge.");
    }

    // Only the server can validate the signature, because it has the public key.
    // See https://github.com/duo-labs/py_webauthn/blob/master/examples/authentication.py
    // for what the sever needs

    return {
      credentials: {
        id: credentials.id, // already urlsafe_base64 encoded
        rawId: credentials.id, // redundant, but required syntactically
        response: {
          authenticatorData: base64_encode_arrayBuffer(
            assertationResponse.authenticatorData
          ),
          clientDataJSON: base64_encode_arrayBuffer(
            assertationResponse.clientDataJSON
          ),
          signature: base64_encode_arrayBuffer(assertationResponse.signature!)
        },
        type: credentials.type,
        authenticatorAttachment: credentials.authenticatorAttachment,
        clientExtensionResults: credentials.getClientExtensionResults()
      },
      id: credentials.id, // already urlsafe_base64 encoded
      expected_challenge: base64_encode_arrayBuffer_urlsafe(
        parameters.challenge as ArrayBuffer
      ),
      expected_rp_id: window.location.hostname, // server will also check this against constant BASE_URL
      expected_origin: window.location.protocol + "//" + window.location.host
    };
  };

  private verifySecurityKeyByBrowser = async (
    authData: AuthData
  ): Promise<BrowserVerificationResults | null> => {
    // First step (done by the browser):
    //   let the browser ask the user to use the security key (insert it if necessary, enter pin, then touch it)
    //   this will return null if the user fails to do so, clicks cancel, or the whole process times out
    // Second step (our own logic):
    //   check that the result is valid for the challenge we passed.

    // As a third step (later, when trying to login) the server will also verify the credentials)
    const credentials: Credential | null = await navigator.credentials.get({
      publicKey: authData.parameters as PublicKeyCredentialRequestOptions
    });
    return credentials == null
      ? null
      : this.verifyExistingCredentialsAgainstChallenge(
          credentials as PublicKeyCredential,
          authData.parameters
        );
  };

  private handleAuthenticationFailure = (
    exitLogin: boolean,
    errorMessage: string
  ) => {
    this.updateModus("typing", errorMessage);
    if (exitLogin) {
      this.storeAuthData(undefined); // -> go back to entering username
      this.focus("username");
    }
  };

  private tryLogin = async () => {
    this.updateModus("loading", "");
    const viewState = this.props.viewState;

    if (
      !this.state.password &&
      !this.state.authData!.userInfo.hasAuthenticators
    ) {
      this.handleAuthenticationFailure(
        true,
        "To log in you need either a password or a security. Please contact the site administrator."
      );
      return;
    }

    const usingAuthenticator: boolean =
      this.state.authData!.userInfo.hasAuthenticators;

    const body: LoginRequestBody = {
      username: this.state.username
    };
    if (usingAuthenticator) {
      let browserVerificationResults: BrowserVerificationResults | null = null;
      try {
        browserVerificationResults = await this.verifySecurityKeyByBrowser(
          this.state.authData!
        );
      } catch (error) {
        // timout or user cacncelled out
      }
      if (browserVerificationResults === null) {
        this.closePanel(); // this means user when supposed to use their security key cancelled out, or it timed out.
        return;
      }
      body.digest = JSON.stringify(browserVerificationResults);
      body.authenticator_id = browserVerificationResults.id;
    } else {
      body.password = this.state.password;
    }

    try {
      const response = await fetchFromAPI(
        viewState,
        "auth/login/session/",
        body,
        "POST"
      );

      // Check if the response status is within the 2xx range
      if (!response.ok) {
        console.log("authentication via 'auth/login/session/' failed.");
        this.handleAuthenticationFailure(
          usingAuthenticator,
          "Authentication Failed"
        );
      } else {
        const data = await response.json();
        debugger;
        if (!("user" in data) || !Boolean(data.sessionid)) {
          console.error(
            "Invalid response when trying to log into Django server:"
          );
          console.error(data);
          this.handleAuthenticationFailure(
            usingAuthenticator,
            "Invalid response from server"
          );
        } else {
          this.login(data);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const usingAuthenticator: boolean = !this.state.password;
      this.handleAuthenticationFailure(usingAuthenticator, message);
    }
  };

  private login = (loginData: LoginData) => {
    this.resetState();
    this.props.viewState.login(loginData);
  };

  render() {
    const { t } = this.props;
    const currentStep: LoginStep = this.getLoginStep();

    const dropdownTheme = {
      inner: Styles.dropdownInner,
      icon: "user"
    };

    const errorMsg = this.state.error;

    // // onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => this.onKeyDown(e, currentStep)}
    // onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => this.onKeyDown(e, currentStep)}
    return (
      //@ts-ignore - not yet ready to tackle tsfying MenuPanel
      <MenuPanel
        theme={dropdownTheme}
        btnRef={this.props.refFromHOC}
        btnTitle={t("loginPanel.btnTitle")} //
        btnText={t("loginPanel.btnText")} //
        isOpen={this.state.isOpen}
        // onDismissed={this.resetState}
        onOpenChanged={this.changeOpenState}
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <Box padded column>
          {errorMsg !== "" && (
            <>
              <Spacing bottom={5} />
              <Text bold color={"#FF0000"}>
                {this.state.error}
              </Text>
              <Spacing bottom={5} />
            </>
          )}

          {currentStep == "typingUsername" && (
            <Box column>
              <Text as="label">{"Please enter your username"}</Text>
              <Spacing bottom={3} />
              <Input
                dark
                type="text"
                placeholder={"Username"}
                value={this.state.username}
                onClick={(e) => e.currentTarget.select()}
                onChange={(e) => this.updateUsername(e.currentTarget.value, "")}
                className={"username"}
              />
              <Spacing bottom={3} />
              <Button
                rounded={true}
                primary={true}
                onClick={this.fetchUser}
                disabled={this.state.username == ""}
              >
                {"Next"}
              </Button>
            </Box>
          )}
          {currentStep == "loadingUser" && <div>Loading User...</div>}
          {currentStep == "typingPassword" && (
            <Box column>
              <Text as="label">{`Please enter the password for user '${this.state.username}'`}</Text>
              <Spacing bottom={3} />
              <Input
                dark
                type="password"
                placeholder={"Password"}
                value={this.state.password}
                onClick={(e) => e.currentTarget.select()}
                onChange={(e) => this.updatePassword(e.currentTarget.value, "")}
                className={"password"}
              />
              <Spacing bottom={3} />
              <Button
                rounded={true}
                primary={true}
                onClick={this.tryLogin}
                disabled={this.state.password == ""}
              >
                {"Login"}
              </Button>
            </Box>
          )}
          {currentStep == "authenticatingPassword" && (
            <div>Authenticating Password...</div>
          )}
          {currentStep == "authenticatingDongle" && (
            <div>Authenticating Dongle...</div>
          )}
        </Box>
      </MenuPanel>
    );
  }
}

// ==================================================================================================================

export const LOGIN_PANEL_NAME = "MenuBarLoginButton";
export default withTranslation()(
  withTheme(withTerriaRef(LoginPanel, LOGIN_PANEL_NAME))
);