// ================================================================================================================================================
// Overridden (for once an actual override, not a replacement) to
// - add an additional property 'treesAppUrl', which can be initialised from an environment variable
// - support login data, including user data and authentication data
// - create an interface (WithViewState_Arbm) that uses the correct type (ViewState_Arbm)
// NOTE: in order to keep code changes to a minimum, when importing ViewState_Arbm we always import it under the alias ViewState
//       that only seems possible if we do NOT export ViewState_Arbm as the default
// ================================================================================================================================================

import {
  action,
  observable,
  makeObservable,
  computed,
  runInAction
} from "mobx";
import { setCookie, removeCookie } from "typescript-cookie";

import ViewState from "terriajs/lib/ReactViewModels/ViewState";
import { sessionStorageDefined } from "../Additions/utils";

const SESSION_COOKIE_NAME = "sessionid";

export class ViewState_Arbm extends ViewState {
  constructor(options: any /* ViewStateOptions */) {
    // ViewStateOptions is not exported by terriajs
    super(options);

    makeObservable(this);
  }

  @computed
  get treesAppUrl(): string {
    if (!this.terria || !this.terria.configParameters) return "";
    return this.terria.configParameters.feedbackUrl || "";
  }

  @observable loginData?: LoginData;

  @action login(loginData: LoginData) {
    this.loginData = loginData;
    setCookie(SESSION_COOKIE_NAME, loginData.sessionid, {
      sameSite: "None",
      secure: true
    }); // no expiry -> session cookie
  }

  @action logout() {
    removeCookie(SESSION_COOKIE_NAME);
    this.loginData = undefined;
  }

  //   @computed
  //   get authTokenHeader(): string {
  //     return this.loginData === undefined ? "" : "Token " + this.loginData.token;
  //   }

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
}

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
