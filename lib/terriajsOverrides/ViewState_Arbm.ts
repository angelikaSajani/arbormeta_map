// ================================================================================================================================================
// Overridden (for once an actual override, not a replacement) to
// - add an additional property 'treesAppUrl', which can be initialised from an environment variable
// - support login data, including user data and authentication data
// - create an interface (WithViewState_Arbm) that uses the correct type (ViewState_Arbm)
// NOTE: in order to keep code changes to a minimum, when importing ViewState_Arbm we always import it under the alias ViewState
//       that only seems possible if we do NOT export ViewState_Arbm as the default
// ================================================================================================================================================

import { action, observable, makeObservable, computed } from "mobx";
import { getCookie, setCookie, removeCookie } from "typescript-cookie";

import ViewState from "terriajs/lib/ReactViewModels/ViewState";
import Catalog from "terriajs/lib/Models/Catalog/Catalog";
import ArbormetaReference from "./ArbormetaReference";
import { compareUris } from "../Additions/utils";
import LoginManager from "../Additions/LoginManager";

const SESSION_COOKIE_NAME = "sessionid";
const ARBORMETA_GROUP_ID = "ArbormetaData";

export class ViewState_Arbm extends ViewState {
  constructor(options: any /* ViewStateOptions */) {
    // ViewStateOptions is not exported by terriajs
    super(options);

    makeObservable(this);
  }

  get sessionCookieAttributes() {
    const hostname = this.treesAppHost!.hostname;
    return {
      sameSite: "None",
      secure: location.protocol === "https:",
      domain: hostname.includes("arbormeta.earth") // remove subdomain if there is one; TBC: we need to find a BETTER WAY
        ? ".arbormeta.earth"
        : hostname
    };
  }

  get treesAppUrl(): string {
    if (!this.terria || !this.terria.configParameters) return "";
    return this.terria.configParameters.feedbackUrl || "";
  }

  get treesAppHost(): HostAndPort | null {
    const withPath = this.terria.configParameters.feedbackUrl || "";
    let result: HostAndPort | null = null;
    if (withPath !== "") {
      const url = new window.URL(withPath);
      result = { hostname: url.hostname, port: 0 };
      if (url.port) {
        result.port = parseInt(url.port);
      } else {
        result.port = url.protocol === "https:" ? 443 : 80;
      }
    }
    return result;
  }

  @observable loginData?: LoginData;

  @action async login(loginData: LoginData) {
    this.loginData = loginData;

    // for easy login on startup next time
    localStorage.setItem("last_username", loginData.user.username);

    setCookie(
      SESSION_COOKIE_NAME,
      loginData.sessionid,
      //@ts-ignore
      this.sessionCookieAttributes
    ); // no expiry -> session cookie
    LoginManager.configureTrustedServers(this);

    await this.refreshArbormetaGroup();
  }

  removeCookies() {
    //@ts-ignore
    setCookie(SESSION_COOKIE_NAME, "logged-out", this.sessionCookieAttributes); // removeCookie did not work
  }

  @action async logout() {
    this.removeCookies();
    this.loginData = undefined;
    LoginManager.configureTrustedServers(this);
    await this.refreshArbormetaGroup();
  }

  @action async refreshArbormetaGroup() {
    let catalog: Catalog = this.terria.catalog;
    let arbmReference = catalog.group.memberModels.find(
      (m) => m.uniqueId === ARBORMETA_GROUP_ID
    );
    if (arbmReference && arbmReference.type == ArbormetaReference.type) {
      await (arbmReference as ArbormetaReference).loadReference(true);
    }
  }

  @computed
  get userBestName(): string {
    if (this.loginData === undefined) return "";
    let user = this.loginData.user!;
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;
  }

  @computed
  get userEmail(): string {
    if (this.loginData === undefined) return "";
    let user = this.loginData.user!;
    return user.email;
  }

  /**
   * To be called during startup, BEFORE data catalog is loaded and the page is rendered.
   * Check whether the page got loaded because the user clicked a link
   * in the ArborMeta web app, and if so, wether there was a logged in user
   * (that is, we have a session cookie)
   * If we do, attempt to log in (without user interaction) via that session cookie,
   * but do not display an error if that does not work.
   */
  checkWebAppSession = async () => {
    console.log("Now inside checkWebAppSession()");

    let referrer = document.referrer;
    console.log(`Referrer: ${document.referrer}`);
    let appUrl = this.treesAppUrl;
    console.log(`appUrl: ${appUrl}`);

    console.log(
      `  compareUris(referrer, appUrl): ${compareUris(referrer, appUrl)}`
    );

    // NOTE: no point testing for sessionid cookie, as under https
    // the cookie is 'http-only', hence javascript can't see it.
    if (referrer && appUrl && compareUris(referrer, appUrl)) {
      console.log("  about to send login request");
      try {
        let loginData: LoginData = await LoginManager.sendLoginRequest(
          appUrl,
          null,
          null
        );
        this.loginData = loginData;
        // for easy login on startup next time
        localStorage.setItem("last_username", loginData.user.username);
        LoginManager.configureTrustedServers(this);
      } catch (e) {
        console.log(`Caught error: ${e}`);
      }
    }
  };
} // end of class ViewState_Arbm

export interface User {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  permissions: Array<string>;
}

export interface LoginData {
  user: User;
  sessionid: string;
}

export interface WithViewState_Arbm {
  viewState: ViewState_Arbm;
}

export interface HostAndPort {
  hostname: string;
  port: number;
}
