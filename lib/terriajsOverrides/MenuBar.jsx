// ================================================================================================================================================
// Overridden to
// - (condictionally) include LoginPanel and LogoutPanel
// - include fixed version of SettingsPanel (small bugfix, we may be able to revert this once its fixed in the original)
// ================================================================================================================================================

import classNames from "classnames";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";

import withControlledVisibility from "terriajs/lib/ReactViews/HOCs/withControlledVisibility";
import { useViewState } from "terriajs/lib/ReactViews/Context";
import LangPanel from "terriajs/lib/ReactViews/Map/Panels/LangPanel/LangPanel";
import SharePanel from "terriajs/lib/ReactViews/Map/Panels/SharePanel/SharePanel";
import ToolsPanel from "terriajs/lib/ReactViews/Map/Panels/ToolsPanel/ToolsPanel";
import StoryButton from "terriajs/lib/ReactViews/Map/MenuBar/StoryButton/StoryButton";
import HelpButton from "terriajs/lib/ReactViews/Map/MenuBar/HelpButton/HelpButton";

import SettingPanel from "./SettingPanel"; // AIS: use our own overrides  < ==================================
import LoginPanel from "../Additions//LoginPanel/LoginPanel";
import LogoutPanel from "../Additions/LogoutPanel/LogoutPanel";

import Styles from "terriajs/lib/ReactViews/Map/MenuBar/menu-bar.scss";

const StyledMenuBar = styled.div`
  pointer-events: none;
  ${(p) =>
    p.trainerBarVisible &&
    `
    top: ${Number(p.theme.trainerHeight) + Number(p.theme.mapButtonTop)}px;
  `}
`;
// The map navigation region
const MenuBar = observer((props) => {
  const viewState = useViewState();
  const terria = viewState.terria;
  const menuItems = props.menuItems || [];
  const handleClick = () => {
    runInAction(() => {
      viewState.topElement = "MenuBar";
    });
  };

  const storyEnabled = terria.configParameters.storyEnabled;
  const enableTools = terria.userProperties.get("tools") === "1";

  return (
    <StyledMenuBar
      className={classNames(
        viewState.topElement === "MenuBar" ? "top-element" : "",
        Styles.menuBar,
        {
          [Styles.menuBarWorkbenchClosed]: viewState.isMapFullScreen
        }
      )}
      onClick={handleClick}
      trainerBarVisible={viewState.trainerBarVisible}
    >
      <section>
        <ul className={classNames(Styles.menu)}>
          {enableTools && (
            <li className={Styles.menuItem}>
              <ToolsPanel />
            </li>
          )}
          {!viewState.useSmallScreenInterface &&
            props.menuLeftItems.map((element, i) => (
              <li className={Styles.menuItem} key={i}>
                {element}
              </li>
            ))}
        </ul>
      </section>
      <section className={classNames(Styles.flex)}>
        <ul className={classNames(Styles.menu)}>
          <li className={Styles.menuItem}>
            <SettingPanel terria={terria} viewState={viewState} />
          </li>
          <li className={Styles.menuItem}>
            <HelpButton viewState={viewState} />
          </li>

          {terria.configParameters?.languageConfiguration?.enabled ? (
            <li className={Styles.menuItem}>
              <LangPanel
                terria={terria}
                smallScreen={viewState.useSmallScreenInterface}
              />
            </li>
          ) : null}
        </ul>
        {storyEnabled && (
          <ul className={classNames(Styles.menu)}>
            <li className={Styles.menuItem}>
              <StoryButton
                terria={terria}
                viewState={viewState}
                theme={props.theme}
              />
            </li>
          </ul>
        )}
        <ul className={classNames(Styles.menu)}>
          <li className={Styles.menuItem}>
            <SharePanel
              terria={terria}
              viewState={viewState}
              animationDuration={props.animationDuration}
            />
          </li>
        </ul>
        {viewState.treesAppUrl && (
          <ul className={classNames(Styles.menu)}>
            <li className={Styles.menuItem}>
              {viewState.loginData ? (
                <LogoutPanel viewState={viewState} />
              ) : (
                <LoginPanel viewState={viewState} />
              )}
            </li>
          </ul>
        )}
        {!viewState.useSmallScreenInterface &&
          menuItems.map((element, i) => (
            <li className={Styles.menuItem} key={i}>
              {element}
            </li>
          ))}
      </section>
    </StyledMenuBar>
  );
});
MenuBar.displayName = "MenuBar";
MenuBar.propTypes = {
  animationDuration: PropTypes.number,
  menuItems: PropTypes.arrayOf(PropTypes.element),
  menuLeftItems: PropTypes.arrayOf(PropTypes.element)
};

export default withControlledVisibility(MenuBar);
