/**
 * Class to provide a number of static member functions to
 * encode and decode strings, array buffers etc.
 */

export default class EncodingUtilities {
  // ========================================================================================
  // HTML
  // ========================================================================================

  /**
   * Function to sanitise and escape HTML
   * @param input - Original string
   * @returns - Sanitised string (possibly empty, but never null)
   */
  static sanitizeHTML = (input: string): string => {
    const doc = new DOMParser().parseFromString(input, "text/html");
    return doc.body.textContent || "";
  };

  // ========================================================================================
  // String -> Array collection
  // ========================================================================================

  /**
   * Decode a base64 encoded string and convert a Uint8Array
   * @param base64 - base 64 encoded string
   * @returns - {@link Uint8Array}
   */
  static base64_decode = (base64: string): Uint8Array => {
    // base64 string -> Uint8Array
    let binaryString: string = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  /**
   * Decode a base64 encoded string **AFTER reversing url-safe encoding**, then convert a Uint8Array
   * @param base64 - base 64 encoded string
   * @returns - {@link Uint8Array}
   */
  static base64_decode_urlsafe = (base64: string): Uint8Array => {
    // url-safe base64 string -> Uint8Array
    base64 += Array(5 - (base64.length % 4)).join("=");
    base64 = base64
      .replace(/\-/g, "+") // Convert '-' to '+'
      .replace(/\_/g, "/"); // Convert '_' to '/'
    return EncodingUtilities.base64_decode(base64);
  };

  // ========================================================================================
  // Array -> String collection
  // ========================================================================================

  /**
   * Convert Array Buffer to string
   * @param arrayBuffer - {@link ArrayBuffer}
   * @returns string
   */
  static arrayBufferToString = (arrayBuffer: ArrayBuffer): string => {
    return String.fromCharCode(...new Uint8Array(arrayBuffer));
  };

  /**
   * Convert Array Buffer to string, then base64 encode it
   * @param arrayBuffer - {@link ArrayBuffer}
   * @returns base64 encoded string
   */
  static base64_encode_arrayBuffer = (arrayBuffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  };

  /**
   * Convert Array Buffer to string, then base64 encode it, then make it an url-safe string
   * @param arrayBuffer - {@link ArrayBuffer}
   * @returns base64 encoded string
   */
  static base64_encode_arrayBuffer_urlsafe = (
    arrayBuffer: ArrayBuffer
  ): string => {
    let result = EncodingUtilities.base64_encode_arrayBuffer(arrayBuffer);
    return result
      .replace(/\+/g, "-") // Convert '+' to '-'
      .replace(/\//g, "_") // Convert '/' to '_'
      .replace(/=+$/, ""); // Remove ending '='
  };

  // ========================================================================================
  // Arrays
  // ========================================================================================

  /**
   * Compare two Uint8Arrays
   * @param a1 - {@link Uint8Array}
   * @param a2 - {@link Uint8Array}
   * @returns true or false
   */
  static arraysAreEqual = (a1: Uint8Array, a2: Uint8Array): boolean => {
    let n1 = a1.length;
    let n2 = a2.length;
    if (n1 != n2) return false;

    for (let i = 0; i < n1; i++) {
      if (a1[i] != a2[i]) return false;
    }
    return true;
  };
}
