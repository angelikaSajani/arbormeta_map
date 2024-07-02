"use strict";

var terriaOptions = {
  baseUrl: "build/TerriaJS"
};

import { runInAction } from "mobx";
import ConsoleAnalytics from "terriajs/lib/Core/ConsoleAnalytics";
import GoogleAnalytics from "terriajs/lib/Core/GoogleAnalytics";
import ShareDataService from "terriajs/lib/Models/ShareDataService";
// import registerAnalytics from 'terriajs/lib/Models/registerAnalytics';
import registerCustomComponentTypes from "terriajs/lib/ReactViews/Custom/registerCustomComponentTypes";
// import Terria from "terriajs/lib/Models/Terria";
//@ts-ignore
import { Terria_Arbm as Terria } from "./lib/terriajsOverrides/Terria_Arbm";
import updateApplicationOnHashChange from "terriajs/lib/ViewModels/updateApplicationOnHashChange";
import updateApplicationOnMessageFromParentWindow from "terriajs/lib/ViewModels/updateApplicationOnMessageFromParentWindow";
import { ViewState_Arbm as ViewState } from "./lib/terriajsOverrides/ViewState_Arbm";
import render from "./lib/Views/render";
import registerCatalogMembers from "terriajs/lib/Models/Catalog/registerCatalogMembers";
import registerSearchProviders from "terriajs/lib/Models/SearchProviders/registerSearchProviders";
import defined from "terriajs-cesium/Source/Core/defined";
import loadPlugins from "./lib/Core/loadPlugins";
import plugins from "./plugins";

import CatalogMemberFactory from "terriajs/lib/Models/Catalog/CatalogMemberFactory"; // AIS, added  < ======================== all those imports
import ArbormetaReference from "./lib/terriajsOverrides/ArbormetaReference";
import Cesium3DTilesCatalogItem_Geo from "./lib/terriajsOverrides/Cesium3DTiles/Cesium3DTilesCatalogItem_Geo";

// Register all types of catalog members in the core TerriaJS.  If you only want to register a subset of them
// (i.e. to reduce the size of your application if you don't actually use them all), feel free to copy a subset of
// the code in the registerCatalogMembers function here instead.
// registerCatalogMembers();
// registerAnalytics();
// Test change B

// we check exact match for development to reduce chances that production flag isn't set on builds(?)

if (process.env.NODE_ENV === "development") {
  terriaOptions.analytics = new ConsoleAnalytics();
} else {
  terriaOptions.analytics = new GoogleAnalytics();
}

console.log("TerriaMap is starting up");

// const s3_accessKeyId = process.env.REACT_S3_ACCESS_KEY_ID;
// const s3_secretAccessKey = process.env.REACT_S3_SECRET_ACCESS_KEY;
// const s3_host = process.env.REACT_S3_HOST || "backblaze.com";
// const s3_region = process.env.REACT_S3_REGION;
// console.log(`s3_accessKeyId: ${s3_accessKeyId}`);
// console.log(`s3_secretAccessKey: ${s3_secretAccessKey}`);
// console.log(`s3_host: ${s3_host}`);
// console.log(`s3_region: ${s3_region}`);

// Construct the TerriaJS application, arrange to show errors to the user, and start it up.
var terria = new Terria(terriaOptions);

// Register custom components in the core TerriaJS.  If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerCustomComponentTypes function here instead.
registerCustomComponentTypes(terria);

// Create the ViewState before terria.start so that errors have somewhere to go.
const viewState = new ViewState({
  terria: terria
});

registerCatalogMembers();
CatalogMemberFactory.register(ArbormetaReference.type, ArbormetaReference); // AIS, added  < ======================== our own top-level group
CatalogMemberFactory.register(
   Cesium3DTilesCatalogItem_Geo.type,
   Cesium3DTilesCatalogItem_Geo
); // AIS, added  < ======================== for the moment only for debugging

// Register custom search providers in the core TerriaJS. If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerSearchProviders function here instead.
registerSearchProviders();

// TBR!!!!! remove commented out if-clause
// if (process.env.NODE_ENV === "development") {
window.viewState = viewState;
// }

// If we're running in dev mode, disable the built style sheet as we'll be using the webpack style loader.
// Note that if the first stylesheet stops being nationalmap.css then this will have to change.
if (process.env.NODE_ENV !== "production" && module.hot) {
  document.styleSheets[0].disabled = true;
}

// http://localhost:3002/#start=%7B%22version%22%3A%228.0.0%22%2C%22initSources%22%3A%5B%7B%22stratum%22%3A%22user%22%2C%22models%22%3A%7B%22cEynH3ca%22%3A%7B%22dereferenced%22%3A%7B%22isOpen%22%3Atrue%7D%2C%22knownContainerUniqueIds%22%3A%5B%22Root+Group%2FNational+Data+Sets%22%5D%2C%22type%22%3A%22terria-reference%22%7D%2C%22zaSvrVue%22%3A%7B%22opacity%22%3A0.73%2C%22knownContainerUniqueIds%22%3A%5B%22cEynH3ca%22%5D%2C%22type%22%3A%22esri-mapServer%22%7D%2C%22%2F%22%3A%7B%22type%22%3A%22group%22%7D%2C%22Root+Group%2FNational+Data+Sets%22%3A%7B%22knownContainerUniqueIds%22%3A%5B%22%2F%22%5D%2C%22type%22%3A%22group%22%7D%7D%2C%22workbench%22%3A%5B%22zaSvrVue%22%5D%2C%22timeline%22%3A%5B%22zaSvrVue%22%5D%2C%22initialCamera%22%3A%7B%22west%22%3A104.45065391410617%2C%22south%22%3A-37.69123526967361%2C%22east%22%3A151.52589564426904%2C%22north%22%3A-23.097982602197575%2C%22position%22%3A%7B%22x%22%3A-5252677.800293835%2C%22y%22%3A6725957.693319678%2C%22z%22%3A-5384520.226419353%7D%2C%22direction%22%3A%7B%22x%22%3A0.5192125308652523%2C%22y%22%3A-0.6648421337105099%2C%22z%22%3A0.5370319218033095%7D%2C%22up%22%3A%7B%22x%22%3A-0.3305432550409885%2C%22y%22%3A0.42325458247095726%2C%22z%22%3A0.8435619212388878%7D%7D%2C%22homeCamera%22%3A%7B%22west%22%3A144.657%2C%22south%22%3A-29.535%2C%22east%22%3A144.82%2C%22north%22%3A-29.34%7D%2C%22viewerMode%22%3A%223d%22%2C%22showSplitter%22%3Afalse%2C%22splitPosition%22%3A0.4999%2C%22settings%22%3A%7B%22baseMaximumScreenSpaceError%22%3A2%2C%22useNativeResolution%22%3Afalse%2C%22alwaysShowTimeline%22%3Afalse%2C%22baseMapId%22%3A%22basemap-bing-aerial-with-labels%22%2C%22terrainSplitDirection%22%3A0%2C%22depthTestAgainstTerrainEnabled%22%3Afalse%7D%2C%22stories%22%3A%5B%5D%7D%5D%7D

module.exports = terria
  .start({
    applicationUrl: window.location,
    configUrl: "config.json",
    shareDataService: new ShareDataService({
      terria: terria
    }),
    beforeRestoreAppState: async () => {
      // Check whether the page was loaded because a link in the web-app
      // was clicked, and if yes, whether we have a session cookie.
      // If yes, attempt to login via that Cookie BEFORE loading data.

      await viewState.checkWebAppSession();

      // Load plugins before restoring app state because app state may
      // reference plugin components and catalog items.
      return loadPlugins(viewState, plugins).catch((error) => {
        console.error(`Error loading plugins`);
        console.error(error);
      });
    }
  })
  .catch(function (e) {
    terria.raiseErrorToUser(e);
  })
  .finally(function () {
    terria.loadInitSources().then((result) => result.raiseError(terria));

    try {
      // Automatically update Terria (load new catalogs, etc.) when the hash part of the URL changes.
      updateApplicationOnHashChange(terria, window);
      updateApplicationOnMessageFromParentWindow(terria, window);

      // Show a modal disclaimer before user can do anything else.
      if (defined(terria.configParameters.globalDisclaimer)) {
        var globalDisclaimer = terria.configParameters.globalDisclaimer;
        var hostname = window.location.hostname;
        if (
          globalDisclaimer.enableOnLocalhost ||
          hostname.indexOf("localhost") === -1
        ) {
          var message = "";
          // Sometimes we want to show a preamble if the user is viewing a site other than the official production instance.
          // This can be expressed as a devHostRegex ("any site starting with staging.") or a negative prodHostRegex ("any site not ending in .gov.au")
          if (
            (defined(globalDisclaimer.devHostRegex) &&
              hostname.match(globalDisclaimer.devHostRegex)) ||
            (defined(globalDisclaimer.prodHostRegex) &&
              !hostname.match(globalDisclaimer.prodHostRegex))
          ) {
            message += require("./lib/Views/DevelopmentDisclaimerPreamble.html");
          }
          message += require("./lib/Views/GlobalDisclaimer.html");

          var options = {
            title:
              globalDisclaimer.title !== undefined
                ? globalDisclaimer.title
                : "Warning",
            confirmText: globalDisclaimer.buttonTitle || "Ok",
            denyText: globalDisclaimer.denyText || "Cancel",
            denyAction: globalDisclaimer.afterDenyLocation
              ? function () {
                  window.location = globalDisclaimer.afterDenyLocation;
                }
              : undefined,
            width: 600,
            height: 550,
            message: message,
            horizontalPadding: 100
          };
          runInAction(() => {
            viewState.disclaimerSettings = options;
            viewState.disclaimerVisible = true;
          });
        }
      }

      // Add font-imports
      const fontImports = terria.configParameters.theme?.fontImports;
      if (fontImports) {
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = fontImports;
        document.head.appendChild(styleSheet);
      }

      render(terria, [], viewState);
    } catch (e) {
      console.error(e);
      console.error(e.stack);
    }
  });
