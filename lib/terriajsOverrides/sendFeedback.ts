// ================================================================================================================================================
// Overridden because to send the Authentication token in the 'Authorization' header if a user is logged in
// To do so, we had to define an extra option, the ViewState
// and use fetch instead of loadWithXhr
// ================================================================================================================================================

import i18next from "i18next";
import isDefined from "terriajs/lib/Core/isDefined";
import TerriaError from "terriajs/lib/Core/TerriaError";
import {
  buildShareLink,
  buildShortShareLink,
  canShorten
} from "terriajs/lib/ReactViews/Map/Panels/SharePanel/BuildShareLink";

import Terria from "terriajs/lib/Models/Terria";
import { ViewState_Arbm as ViewState } from "./ViewState_Arbm"; // AIS: user our override  < ==============

export default function sendFeedback(options: {
  terria: Terria;
  title?: string;
  name: string;
  email: string;
  sendShareURL: boolean;
  comment: string;
  viewState: ViewState; // AIS, added                              < =====================================================================================
  additionalParameters?: Record<string, string | undefined>;
}) {
  if (!isDefined(options) || !isDefined(options.terria)) {
    throw TerriaError.from("options.terria is required.");
  }

  const terria = options.terria;
  const viewState = options.viewState;

  if (!isDefined(terria.configParameters.feedbackUrl)) {
    raiseError(terria, "`terria.configParameters.feedbackUrl` is not defined");
    return;
  }

  const shareLinkPromise = options.sendShareURL
    ? canShorten(terria)
      ? buildShortShareLink(terria)
      : Promise.resolve(buildShareLink(terria))
    : Promise.resolve("Not shared");

  return shareLinkPromise
    .then((shareLink) => {
      const feedbackData: Record<string, string | undefined> = {
        title: options.title,
        name: options.name,
        email: options.email,
        shareLink: shareLink,
        comment: options.comment
      };
      if (
        options.additionalParameters &&
        terria.serverConfig.config &&
        terria.serverConfig.config.additionalFeedbackParameters
      ) {
        terria.serverConfig.config.additionalFeedbackParameters.forEach(
          ({ name }: any) => {
            feedbackData[name] = options.additionalParameters?.[name];
          }
        );
      }

      // AIS, added/modified                                 < =====================================================================================
      // Tell the server who's logged in
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      const authTokenHeader = viewState.authTokenHeader;
      if (authTokenHeader) {
        headers["Authorization"] = authTokenHeader;
      }

      // AIS: using fetch instead of loadWithXhr              < =====================================================================================
      let url: string = terria.configParameters.feedbackUrl!;
      return fetch(url, {
        method: "POST",
        credentials: "include", //credentials: 'omit',
        mode: "cors", // ====
        cache: "no-cache",
        body: JSON.stringify(feedbackData),
        headers: headers
      });
    })
    .then(function (json) {
      if (json instanceof String) {
        json = JSON.parse(json.toString());
      }
      if (typeof json === "string") {
        json = JSON.parse(json);
      }

      //  AIS: our response does not include a 'result' item  < =====================================================================================
      if (
        !json // && (!json.result || json.result !== "SUCCESS")
      ) {
        raiseError(
          terria,
          `Failed to parse response from server: \`${JSON.stringify(json)}\``
        );
        return false;
      } else {
        terria.notificationState.addNotificationToQueue({
          title: i18next.t("models.feedback.thanksTitle"),
          message: i18next.t("models.feedback.thanksMessage", {
            appName: terria.appName
          })
        });
        return true;
      }
    })
    .catch(function (e) {
      raiseError(terria, e);
      return false;
    });
}

function raiseError(terria: Terria, error: unknown) {
  terria.raiseErrorToUser(
    TerriaError.from(error, {
      title: i18next.t("models.feedback.unableToSendTitle"),
      message: i18next.t("models.feedback.unableToSendTitle")
    })
  );
}
