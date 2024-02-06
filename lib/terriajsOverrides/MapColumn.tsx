// ================================================================================================================================================
// Overridden to include our version of MenuBar, otherwise unchanged
// ================================================================================================================================================

import { observer } from "mobx-react";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";

import Box from "terriajs/lib/Styled/Box";
import ActionBarPortal from "terriajs/lib/ReactViews/ActionBar/ActionBarPortal";
import BottomDock from "terriajs/lib/ReactViews/BottomDock/BottomDock";
import { useViewState } from "terriajs/lib/ReactViews/Context";
import Loader from "terriajs/lib/ReactViews/Loader";
import SlideUpFadeIn from "terriajs/lib/ReactViews/Transitions/SlideUpFadeIn/SlideUpFadeIn";
import { BottomBar } from "terriajs/lib/ReactViews/Map/BottomBar";
import BottomLeftBar from "terriajs/lib/ReactViews/Map/BottomLeftBar/BottomLeftBar";
import { MapNavigation } from "terriajs/lib/ReactViews/Map/MapNavigation";
import MenuBar from "./MenuBar"; // AIS: import our own override                   < ======================================================================
import { ProgressBar } from "terriajs/lib/ReactViews/Map/ProgressBar";
import { TerriaViewerWrapper } from "terriajs/lib/ReactViews/Map/TerriaViewerWrapper";
import Toast from "terriajs/lib/ReactViews/Map/Toast";

interface IMapColumnProps {
  customFeedbacks: any;
  animationDuration: number;
  customElements: any;
}

/**
 * Right-hand column that contains the map, controls that sit over the map and sometimes the bottom dock containing
 * the timeline and charts.
 */
export const MapColumn: FC<IMapColumnProps> = observer(
  ({ customFeedbacks, customElements, animationDuration }) => {
    const viewState = useViewState();
    const { t } = useTranslation();

    return (
      <Box
        column
        fullWidth
        fullHeight
        css={`
          * {
            box-sizing: border-box;
          }
        `}
      >
        <Box column fullWidth fullHeight>
          <div
            css={{
              position: "absolute",
              top: "0",
              left: "0",
              zIndex: 1,
              width: "100%"
            }}
          >
            <ProgressBar />
          </div>
          {!viewState.hideMapUi && (
            <div
              css={`
                ${viewState.explorerPanelIsVisible && "opacity: 0.3;"}
              `}
            >
              <MenuBar
                // @ts-ignore
                menuItems={customElements.menu}
                menuLeftItems={customElements.menuLeft}
                animationDuration={animationDuration}
                elementConfig={viewState.terria.elements.get("menu-bar")}
              />
              <MapNavigation
                viewState={viewState}
                navItems={customElements.nav}
                elementConfig={viewState.terria.elements.get("map-navigation")}
              />
            </div>
          )}
          <Box
            position="absolute"
            css={{ top: "0", zIndex: 0 }}
            fullWidth
            fullHeight
          >
            <TerriaViewerWrapper />
          </Box>
          {!viewState.hideMapUi && (
            <>
              <BottomLeftBar />
              <ActionBarPortal show={viewState.isActionBarVisible} />
              <SlideUpFadeIn isVisible={viewState.isMapZooming}>
                <Toast>
                  <Loader
                    message={t("toast.mapIsZooming")}
                    textProps={{
                      style: {
                        padding: "0 5px"
                      }
                    }}
                  />
                </Toast>
              </SlideUpFadeIn>
              <Box
                position="absolute"
                fullWidth
                css={{ bottom: "0", left: "0" }}
              >
                <BottomBar />
              </Box>

              {viewState.terria.configParameters.printDisclaimer && (
                <a
                  css={`
                    display: none;
                    @media print {
                      display: block;
                      width: 100%;
                      clear: both;
                    }
                  `}
                  href={viewState.terria.configParameters.printDisclaimer.url}
                >
                  {viewState.terria.configParameters.printDisclaimer.text}
                </a>
              )}
            </>
          )}
        </Box>
        <div>
          {!viewState.hideMapUi && (
            <BottomDock
              terria={viewState.terria}
              viewState={viewState}
              elementConfig={viewState.terria.elements.get("bottom-dock")}
            />
          )}
        </div>
      </Box>
    );
  }
);

export default MapColumn;
