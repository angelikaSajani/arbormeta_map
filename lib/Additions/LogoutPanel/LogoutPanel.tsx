import { TFunction } from "i18next";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { withTranslation, WithTranslation } from "react-i18next";

import { DefaultTheme, withTheme } from "styled-components";
import Box from "terriajs/lib/Styled/Box";
import Button from "terriajs/lib/Styled/Button";
import Text from "terriajs/lib/Styled/Text";
import withTerriaRef from "terriajs/lib/ReactViews/HOCs/withTerriaRef";
import MenuPanel from "terriajs/lib/ReactViews/StandardUserInterface/customizable/MenuPanel";
import Spacing from "terriajs/lib/Styled/Spacing";

import { ViewState_Arbm as ViewState } from "../../terriajsOverrides/ViewState_Arbm";

import Styles from "./logout-panel.scss";

type PropTypes = WithTranslation & {
  viewState: ViewState;
  refFromHOC?: React.Ref<HTMLDivElement>;
  theme: DefaultTheme;
  t: TFunction;
};

//@ts-ignore
@observer
class LogoutPanel extends React.Component<PropTypes> {
  /**
   * @param {Props} props
   */
  constructor(props: PropTypes) {
    super(props);
    makeObservable(this);
  }

  getButtonText(t: TFunction): string {
    const user = this.props.viewState.loginData!.user;
    const username = user ? user.username : null;
    return (username ? username + " | " : "") + t("logoutPanel.btnText");
  }

  render() {
    const { t } = this.props;

    const user = this.props.viewState.loginData!.user;
    if (!user) return null;

    const name = user.first_name ? user.first_name : user.username;

    const dropdownTheme = {
      inner: Styles.dropdownInner,
      icon: "user"
    };

    return (
      //@ts-ignore - not yet ready to tackle tsfying MenuPanel
      <MenuPanel
        theme={dropdownTheme}
        btnRef={this.props.refFromHOC}
        btnTitle={t("logoutPanel.btnTitle")} //
        btnText={this.getButtonText(t)} //
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <Box padded column>
          <Spacing bottom={3} />
          <Text bold as="label">
            {t("logoutPanel.areYouSure").replace("$name", name)}
          </Text>
          <Spacing bottom={3} />
          <LogoutButton viewState={this.props.viewState} t={t} />
        </Box>
      </MenuPanel>
    );
  }
}

interface ILogoutButtonProps {
  viewState: ViewState;
  t: TFunction;
}

function LogoutButton({ viewState, t }: ILogoutButtonProps) {
  const handleLogoutClick = async () => {
    try {
      const authTokenHeader = viewState.authTokenHeader;
      if (authTokenHeader) {
        // This tells the server that the user has logged out -> deletes the token from the databasee
        const url = viewState.treesAppUrl! + "auth/logout/";
        const _ = await fetch(url, {
          method: "POST",
          credentials: "omit",
          mode: "cors",
          cache: "no-cache",
          body: "{}",
          headers: {
            Authorization: authTokenHeader
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      // This updates the UI to show the user as logged out
      viewState.logout();
    }
  };

  return (
    <Button rounded={true} primary={true} onClick={handleLogoutClick}>
      {t("logoutPanel.btnText")}
    </Button>
  );
}

export const LOGOUT_PANEL_NAME = "MenuBarLogoutButton";
export default withTranslation()(
  withTheme(withTerriaRef(LogoutPanel, LOGOUT_PANEL_NAME))
);
