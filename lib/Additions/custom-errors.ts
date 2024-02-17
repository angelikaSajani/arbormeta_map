/** name: `'TimeoutError'` */
export class CustomTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** name: `'AbortError'` */
export class CustomAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbortError";
  }
}

/**
 * name: `'NetworkError'`
 *
 * Extra payload:
 *  - `statusCode: integer`
 */
export class CustomNetworkError extends Error {
  statusCode: number;
  constructor(statusCode: number, statusText: string) {
    super(statusText);
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}

/** name: `'InvalidResponse'`
 *
 * Extra payload:
 *  - `missingKey: string`
 *  - `fullResponse: any`
 */
export class CustomInvalidResponse extends Error {
  missingKey: string;
  fullResponse: any;
  constructor(message: string, missingKey: string, fullResponse: any) {
    super(message);
    this.name = "InvalidResponse";
    this.missingKey = missingKey;
    this.fullResponse = fullResponse;
  }
}

/** name: `'DisplayError'`
 *
 * Use: To mark an error as one we want to display in a notification window to the user
 */
export class DisplayError extends Error {
  //
  constructor(message: string) {
    super(message);
    this.name = "DisplayError";
  }
}

/** name: `'AuthenticationError'`
 *
 * Use: To mark an error as one we want to display in a login dialog
 *
 */
export class CustomAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
