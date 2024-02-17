import { ViewState_Arbm as ViewState } from "../terriajsOverrides/ViewState_Arbm";

// ---------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------

export function sessionStorageNotDefined(key: string): boolean {
  const data = sessionStorage.getItem(key);
  return (
    data === undefined ||
    data === null ||
    data === "undefined" ||
    data === "null" ||
    data === "[object Object]" ||
    data === ""
  );
}

// ----------------------------------------------------------------------------------------

export function sessionStorageDefined(key: string): boolean {
  return !sessionStorageNotDefined(key);
}

// ----------------------------------------------------------------------------------------

export function loadFromSession(key: string, type: string | null = null): any {
  // If type is null (the default) the content loaded from sessionStorage is parsed as JSON.
  // If type is NOT null, it should be 'string', 'int', 'float', or 'boolean'
  //  In those cases the result will not be parsed from JSON, but
  //  automatic conversion from text (if necessary) will happen

  const item: string | null = sessionStorage.getItem(key);
  if (type === null) {
    if (item === null) {
      return null;
    }
    try {
      return JSON.parse(item);
    } catch {
      console.warn(`Could not parse JSON from session storage, key: '${key}'`);
      return null;
    }
  } else {
    const itemType = typeof item;
    switch (type) {
      case "int":
        return itemType === "string" ? parseInt(item!) : item;
      case "float":
        return itemType === "string" ? parseFloat(item!) : item;
      case "string":
        let result = itemType === "string" ? item! : "" + item;
        if (result === "null") return null;
        return result;
      case "boolean":
        return itemType === "string"
          ? parseBool(item!)
          : itemType === "number"
          ? //@ts-ignore
            item != 0
          : item;
      default:
        console.warn(`loadFromSession('${key}', '${type}'): unsupported type!`);
        return item;
    }
  }
} // loadFromSession()

// ----------------------------------------------------------------------------------------

export function parseBool(val: any): boolean {
  return (
    val === true ||
    val === 1 ||
    val === "1" ||
    (typeof (val === "string") && val.toLowerCase() === "true")
  );
}
