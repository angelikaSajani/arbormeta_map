import i18next from "i18next";
import { flow } from "mobx";
import isDefined from "terriajs/lib/Core/isDefined";
import { isJsonObject, JsonObject } from "terriajs/lib/Core/Json";
import loadJson5 from "terriajs/lib/Core/loadJson5";
import TerriaError from "terriajs/lib/Core/TerriaError";
import GroupMixin from "terriajs/lib/ModelMixins/GroupMixin";
import ReferenceMixin from "terriajs/lib/ModelMixins/ReferenceMixin";
import UrlMixin from "terriajs/lib/ModelMixins/UrlMixin";
import TerriaReferenceTraits from "terriajs/lib/Traits/TraitsClasses/TerriaReferenceTraits";
import CommonStrata from "terriajs/lib/Models/Definition/CommonStrata";
import CreateModel from "terriajs/lib/Models/Definition/CreateModel";
import { BaseModel } from "terriajs/lib/Models/Definition/Model";
import updateModelFromJson from "terriajs/lib/Models/Definition/updateModelFromJson";
import CatalogMemberFactory from "terriajs/lib/Models/Catalog/CatalogMemberFactory";
import proxyCatalogItemUrl from "terriajs/lib/Models/Catalog/proxyCatalogItemUrl";

import TerriaReference from "terriajs/lib/Models/Catalog/CatalogReferences/TerriaReference";
/**
 * Exact copy of {@link TerriaReference}
 * except that `forceLoadReference` is public
 */
export default class ArbormetaReference extends UrlMixin(
  ReferenceMixin(CreateModel(TerriaReferenceTraits))
) {
  static readonly type = "arbm-reference";

  get type() {
    return ArbormetaReference.type;
  }

  public forceLoadReference = flow(function* (
    this: ArbormetaReference,
    _previousTarget: BaseModel | undefined
  ) {
    if (this.url === undefined || this.uniqueId === undefined) {
      return undefined;
    }

    const initJson = yield loadJson5(
      proxyCatalogItemUrl(this, this.url, this.cacheDuration)
    );

    if (!isJsonObject(initJson) || !Array.isArray(initJson.catalog)) {
      return;
    }

    let targetJson: any;
    if (this.path) {
      // Find the group/item to load at the path
      targetJson = findCatalogMemberJson(initJson.catalog, this.path.slice());
    } else {
      // Load the entire catalog members as a group
      targetJson = {
        type: "group",
        members: initJson.catalog,
        name: this.name
      };
    }

    if (typeof targetJson?.type === "string") {
      const target = CatalogMemberFactory.create(
        targetJson.type,
        this.uniqueId,
        this.terria,
        this
      );

      if (target === undefined) {
        throw new TerriaError({
          sender: this,
          title: i18next.t("models.catalog.unsupportedTypeTitle"),
          message: i18next.t("models.catalog.unsupportedTypeMessage", {
            type: `"${targetJson.type}"`
          })
        });
      } else {
        if (targetJson.name !== undefined) {
          // Override the target's name with the name of this reference.
          // This avoids the name of the catalog suddenly changing after the reference is loaded.
          targetJson.name = this.name;
        }
        // Override `GroupTraits` if targetJson is a group

        if (
          GroupMixin.isMixedInto(target) &&
          isDefined(targetJson.isOpen) &&
          typeof targetJson.isOpen === "boolean"
        ) {
          target.setTrait(
            CommonStrata.definition,
            "isOpen",
            targetJson.isOpen as boolean
          );
        }

        updateModelFromJson(
          target,
          CommonStrata.definition,
          targetJson
        ).catchError((error) => {
          target.setTrait(CommonStrata.underride, "isExperiencingIssues", true);
          error.log();
        });
        return target;
      }
    }
    throw new TerriaError({
      sender: this,
      title: i18next.t("models.terria-reference.failedToLoadTarget"),
      message: i18next.t("models.terria-reference.failedToLoadTarget")
    });
  });
}

/**
 * Returns a catalog member JSON at the specified path or undefined if it doesn't exist.
 */
function findCatalogMemberJson(
  catalogMembers: any[],
  path: string[]
): JsonObject | undefined {
  const member = path.reduce(
    (group, id) => {
      if (Array.isArray(group?.members)) {
        return group.members.find((m) => m?.id === id);
      } else {
        return undefined;
      }
    },
    { members: catalogMembers }
  );
  return member;
}
