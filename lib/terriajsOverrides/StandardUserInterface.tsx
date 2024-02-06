// ================================================================================================================================================
// Overridden to
// - use our own override of FeedbackForm
// - use our own override of MapColumn (in order to include login/logout buttons)
// ================================================================================================================================================

import classNames from "classnames";
import "inobounce";
import { action } from "mobx";
import { observer } from "mobx-react";
import React, { ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DefaultTheme } from "styled-components";
import combine from "terriajs-cesium/Source/Core/combine";

import arrayContains from "terriajs/lib/Core/arrayContains";
import { ViewState_Arbm as ViewState } from "./ViewState_Arbm";
import Disclaimer from "terriajs/lib/ReactViews/Disclaimer";
import DragDropFile from "terriajs/lib/ReactViews/DragDropFile";
import DragDropNotification from "terriajs/lib/ReactViews/DragDropNotification";
import ExplorerWindow from "terriajs/lib/ReactViews/ExplorerWindow/ExplorerWindow";
import FeatureInfoPanel from "terriajs/lib/ReactViews/FeatureInfo/FeatureInfoPanel";
import FeedbackForm from "./FeedbackForm"; // AIS: use our override                    < ============================================================
import { Medium, Small } from "terriajs/lib/ReactViews/Generic/Responsive";
import SatelliteHelpPrompt from "terriajs/lib/ReactViews/HelpScreens/SatelliteHelpPrompt";
import withFallback from "terriajs/lib/ReactViews/HOCs/withFallback";
import ExperimentalFeatures from "terriajs/lib/ReactViews/StandardUserInterface/ExperimentalFeatures";
import { CollapsedNavigation } from "terriajs/lib/ReactViews/Map/MapNavigation";
import HelpPanel from "terriajs/lib/ReactViews/Map/Panels/HelpPanel/HelpPanel";
import PrintView from "terriajs/lib/ReactViews/Map/Panels/SharePanel/Print/PrintView";
import TrainerBar from "terriajs/lib/ReactViews/StandardUserInterface/TrainerBar/TrainerBar";
import MobileHeader from "terriajs/lib/ReactViews/Mobile/MobileHeader";
import MapInteractionWindow from "terriajs/lib/ReactViews/Notification/MapInteractionWindow";
import Notification from "terriajs/lib/ReactViews/Notification/Notification";
import Branding from "terriajs/lib/ReactViews/SidePanel/Branding";
import FullScreenButton from "terriajs/lib/ReactViews/SidePanel/FullScreenButton";
import SidePanel from "terriajs/lib/ReactViews/SidePanel/SidePanel";
import StoryBuilder from "terriajs/lib/ReactViews/Story/StoryBuilder";
import StoryPanel from "terriajs/lib/ReactViews/Story/StoryPanel/StoryPanel";
import ClippingBoxToolLauncher from "terriajs/lib/ReactViews/Tools/ClippingBox/ClippingBoxToolLauncher";
import Tool from "terriajs/lib/ReactViews/Tools/Tool";
import TourPortal from "terriajs/lib/ReactViews/Tour/TourPortal";
import WelcomeMessage from "terriajs/lib/ReactViews/WelcomeMessage/WelcomeMessage";
import SelectableDimensionWorkflow from "terriajs/lib/ReactViews/Workflow/SelectableDimensionWorkflow";
import WorkflowPanelPortal from "terriajs/lib/ReactViews/Workflow/WorkflowPanelPortal";
import { ContextProviders } from "terriajs/lib/ReactViews/Context";
import { GlobalTerriaStyles } from "terriajs/lib/ReactViews/StandardUserInterface/GlobalTerriaStyles";
import MapColumn from "./MapColumn"; // AIS: use our override                    < ============================================================
import processCustomElements from "terriajs/lib/ReactViews/StandardUserInterface/processCustomElements";
import SidePanelContainer from "terriajs/lib/ReactViews/StandardUserInterface/SidePanelContainer";
import Styles from "terriajs/lib/ReactViews/StandardUserInterface/standard-user-interface.scss";
import { terriaTheme } from "terriajs/lib/ReactViews/StandardUserInterface/StandardTheme";

export const animationDuration = 250;

interface StandardUserInterfaceProps {
  terria: ViewState["terria"];
  viewState: ViewState;
  themeOverrides?: Partial<DefaultTheme>;
  minimumLargeScreenWidth?: number;
  version: string;
  children?: ReactNode;
}

const StandardUserInterfaceBase: React.FC<StandardUserInterfaceProps> =
  observer((props) => {
    const { t } = useTranslation();

    const acceptDragDropFile = action(() => {
      props.viewState.isDraggingDroppingFile = true;
      // if explorer window is already open, we open my data tab
      if (props.viewState.explorerPanelIsVisible) {
        props.viewState.openUserData();
      }
    });

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      if (
        !e.dataTransfer.types ||
        !arrayContains(e.dataTransfer.types, "Files")
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      acceptDragDropFile();
    };

    const shouldUseMobileInterface = () =>
      document.body.clientWidth < (props.minimumLargeScreenWidth ?? 768);

    const resizeListener = action(() => {
      props.viewState.useSmallScreenInterface = shouldUseMobileInterface();
    });

    useEffect(() => {
      window.addEventListener("resize", resizeListener, false);
      return () => {
        window.removeEventListener("resize", resizeListener, false);
      };
    }, []);

    useEffect(resizeListener, [props.minimumLargeScreenWidth]);

    useEffect(() => {
      if (
        props.terria.configParameters.storyEnabled &&
        props.terria.stories &&
        props.terria.stories.length &&
        !props.viewState.storyShown
      ) {
        props.terria.notificationState.addNotificationToQueue({
          title: t("sui.notifications.title"),
          message: t("sui.notifications.message"),
          confirmText: t("sui.notifications.confirmText"),
          denyText: t("sui.notifications.denyText"),
          confirmAction: action(() => {
            props.viewState.storyShown = true;
          }),
          denyAction: action(() => {
            props.viewState.storyShown = false;
          }),
          type: "story",
          width: 300
        });
      }
    }, [props.terria.storyPromptShown]);

    // Merge theme in order of highest priority: themeOverrides props -> theme config parameter -> default terriaTheme
    const mergedTheme = combine(
      props.themeOverrides,
      combine(props.terria.configParameters.theme, terriaTheme, true),
      true
    );
    const theme = mergedTheme;

    const customElements = processCustomElements(
      props.viewState.useSmallScreenInterface,
      props.children
    );

    const terria = props.terria;

    const showStoryBuilder =
      props.viewState.storyBuilderShown &&
      !props.viewState.useSmallScreenInterface;
    const showStoryPanel =
      props.terria.configParameters.storyEnabled &&
      props.terria.stories.length > 0 &&
      props.viewState.storyShown &&
      !props.viewState.explorerPanelIsVisible &&
      !props.viewState.storyBuilderShown;
    return (
      <ContextProviders viewState={props.viewState} theme={mergedTheme}>
        <GlobalTerriaStyles />
        <TourPortal />
        <CollapsedNavigation />
        <SatelliteHelpPrompt />
        <Medium>
          <SelectableDimensionWorkflow />
        </Medium>
        <div className={Styles.storyWrapper}>
          {!props.viewState.disclaimerVisible && <WelcomeMessage />}
          <div
            className={Styles.uiRoot}
            css={`
              ${props.viewState.disclaimerVisible && `filter: blur(10px);`}
            `}
            onDragOver={handleDragOver}
          >
            <div
              className={Styles.ui}
              css={`
                background: ${theme.dark};
              `}
            >
              <div className={Styles.uiInner}>
                {!props.viewState.hideMapUi && (
                  <>
                    <Small>
                      <MobileHeader
                        menuItems={customElements.menu}
                        menuLeftItems={customElements.menuLeft}
                        version={props.version}
                      />
                    </Small>
                    <Medium>
                      <>
                        <WorkflowPanelPortal
                          show={props.terria.isWorkflowPanelActive}
                        />
                        <SidePanelContainer
                          tabIndex={0}
                          show={
                            props.viewState.isMapFullScreen === false &&
                            props.terria.isWorkflowPanelActive === false
                          }
                        >
                          <FullScreenButton
                            minified
                            animationDuration={250}
                            btnText={t("addData.btnHide")}
                          />
                          <Branding version={props.version} />
                          <SidePanel />
                        </SidePanelContainer>
                      </>
                    </Medium>
                  </>
                )}
                <Medium>
                  <div
                    className={classNames(Styles.showWorkbenchButton, {
                      [Styles.showWorkbenchButtonTrainerBarVisible]:
                        props.viewState.trainerBarVisible,
                      [Styles.showWorkbenchButtonisVisible]:
                        props.viewState.isMapFullScreen,
                      [Styles.showWorkbenchButtonisNotVisible]:
                        !props.viewState.isMapFullScreen
                    })}
                  >
                    <FullScreenButton
                      minified={false}
                      btnText={t("sui.showWorkbench")}
                      animationDuration={animationDuration}
                      elementConfig={props.terria.elements.get(
                        "show-workbench"
                      )}
                    />
                  </div>
                </Medium>

                <section className={Styles.map}>
                  <MapColumn
                    customFeedbacks={customElements.feedback}
                    customElements={customElements}
                    animationDuration={animationDuration}
                  />
                  <div id="map-data-attribution" />
                  <main>
                    <ExplorerWindow />
                    {props.terria.configParameters.experimentalFeatures &&
                      !props.viewState.hideMapUi && (
                        <ExperimentalFeatures
                          experimentalItems={customElements.experimentalMenu}
                        />
                      )}
                  </main>
                </section>
              </div>
            </div>
            {!props.viewState.hideMapUi && (
              <Medium>
                <TrainerBar />
              </Medium>
            )}
            <Medium>
              {/* I think this does what the previous boolean condition does, but without the console error */}
              {props.viewState.isToolOpen && (
                <Tool {...props.viewState.currentTool!} />
              )}
            </Medium>

            {props.viewState.panel}

            <Notification />
            <MapInteractionWindow />
            {!customElements.feedback.length &&
              props.terria.configParameters.feedbackUrl &&
              !props.viewState.hideMapUi &&
              props.viewState.feedbackFormIsVisible && <FeedbackForm />}
            <div
              className={classNames(
                Styles.featureInfo,
                props.viewState.topElement === "FeatureInfo"
                  ? "top-element"
                  : "",
                {
                  [Styles.featureInfoFullScreen]:
                    props.viewState.isMapFullScreen
                }
              )}
              tabIndex={0}
              onClick={action(() => {
                props.viewState.topElement = "FeatureInfo";
              })}
            >
              <FeatureInfoPanel />
            </div>
            <DragDropFile />
            <DragDropNotification />
            {showStoryPanel && <StoryPanel />}
          </div>
          {props.terria.configParameters.storyEnabled && showStoryBuilder && (
            <StoryBuilder
              isVisible={showStoryBuilder}
              animationDuration={animationDuration}
            />
          )}
          {props.viewState.showHelpMenu &&
            props.viewState.topElement === "HelpPanel" && <HelpPanel />}
          <Disclaimer />
        </div>
        {props.viewState.printWindow && (
          <PrintView
            window={props.viewState.printWindow}
            closeCallback={() => props.viewState.setPrintWindow(null)}
          />
        )}
        <ClippingBoxToolLauncher viewState={props.viewState} />
      </ContextProviders>
    );
  });

export const StandardUserInterface = withFallback(StandardUserInterfaceBase);
export default withFallback(StandardUserInterfaceBase);
