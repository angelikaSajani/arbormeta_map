export class EncodingUtilities {
  // Function to sanitize and escape HTML
  static sanitizeHTML = (input: string): string => {
    const doc = new DOMParser().parseFromString(input, "text/html");
    return doc.body.textContent || "";
  };
  // ========================================================================================
  // Decode a base64 encoded string and convert a Uint8Array
  // ========================================================================================

  static base64_decode = (base64: string): Uint8Array => {
    // base64 string -> Uint8Array
    let binaryString: string = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // ----------------------------------------------------------------------------------------
  // ... ditto, but first reverse url-safe encoding
  // ----------------------------------------------------------------------------------------

  static base64_decode_urlsafe = (base64: string): Uint8Array => {
    // url-safe base64 string -> Uint8Array
    base64 += Array(5 - (base64.length % 4)).join("=");
    base64 = base64
      .replace(/\-/g, "+") // Convert '-' to '+'
      .replace(/\_/g, "/"); // Convert '_' to '/'
    return EncodingUtilities.base64_decode(base64);
  };

  // ========================================================================================
  // Convert Array Buffer to string
  // ========================================================================================

  static arrayBufferToString = (arrayBuffer: ArrayBuffer): string => {
    return String.fromCharCode(...new Uint8Array(arrayBuffer));
  };

  // ----------------------------------------------------------------------------------------
  // ...ditto, then base64 encode
  // ----------------------------------------------------------------------------------------

  static base64_encode_arrayBuffer = (arrayBuffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  };
  // ----------------------------------------------------------------------------------------
  // ...ditto, then make url-safe
  // ----------------------------------------------------------------------------------------

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
  // Compare to Uint8Arrays
  // ========================================================================================

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
