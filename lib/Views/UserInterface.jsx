// ==================================================================================================
// Modified to
// - use our override of StandardUserInterface
// - the href of the About button, atm hardcoded
// ==================================================================================================

import PropTypes from "prop-types";
import React from "react";
import RelatedMaps from "terriajs/lib/ReactViews/RelatedMaps/RelatedMaps";
import {
  ExperimentalMenu,
  MenuLeft
} from "terriajs/lib/ReactViews/StandardUserInterface/customizable/Groups";
import MenuItem from "terriajs/lib/ReactViews/StandardUserInterface/customizable/MenuItem";
import StandardUserInterface from "../terriajsOverrides/StandardUserInterface"; // AIS: Use our own override     < =======================================
import version from "../../version";
import "./global.scss";

// function loadAugmentedVirtuality(callback) {
//   require.ensure(
//     "terriajs/lib/ReactViews/Map/Navigation/AugmentedVirtualityTool",
//     () => {
//       const AugmentedVirtualityTool = require("terriajs/lib/ReactViews/Map/Navigation/AugmentedVirtualityTool");
//       callback(AugmentedVirtualityTool);
//     },
//     "AugmentedVirtuality"
//   );
// }

// function isBrowserSupportedAV() {
//   return /Android|iPhone|iPad/i.test(navigator.userAgent);
// }

export default function UserInterface(props) {
  const relatedMaps = props.viewState.terria.configParameters.relatedMaps;
  const aboutButtonHrefUrl = "https://www.arbormeta.au/about"; // AIS: TBC: make that configurable, environment variable -> ViewState_Arbm
  //    props.viewState.terria.configParameters.aboutButtonHrefUrl; // AIS: this configParameter is hardcoded to 'about.html' in Terria.ts. Don't want to override that

  return (
    <StandardUserInterface {...props} version={version}>
      <MenuLeft>
        {aboutButtonHrefUrl ? (
          <MenuItem
            caption="About"
            href={aboutButtonHrefUrl}
            key="about-link"
          />
        ) : null}
        {relatedMaps && relatedMaps.length > 0 ? (
          <RelatedMaps relatedMaps={relatedMaps} />
        ) : null}
      </MenuLeft>
      <ExperimentalMenu>
        {/* <If condition={isBrowserSupportedAV()}>
          <SplitPoint
            loadComponent={loadAugmentedVirtuality}
            viewState={props.viewState}
            terria={props.viewState.terria}
            experimentalWarning={true}
          />
        </If> */}
      </ExperimentalMenu>
    </StandardUserInterface>
  );
}

UserInterface.propTypes = {
  terria: PropTypes.object,
  viewState: PropTypes.object
};
