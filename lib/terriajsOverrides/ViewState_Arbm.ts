import { action, observable, makeObservable } from "mobx";

import ViewState from "terriajs/lib/ReactViewModels/ViewState";

export class ViewState_Arbm extends ViewState {
  @observable treesAppUrl: string = "http://localhost:8043/api/v1/";

  @observable loginData?: LoginData;

  @action login(loginData: LoginData) {
    this.loginData = loginData;
  }

  @action logout() {
    this.loginData = undefined;
  }

  get authTokenHeader(): string {
    return this.loginData === undefined ? "" : "Token " + this.loginData.token;
  }

  get userBestName(): string {
    if (this.loginData === undefined) return "";
    let user = this.loginData.user!;
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;
  }

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
  expiry: string;
  token: string;
}
