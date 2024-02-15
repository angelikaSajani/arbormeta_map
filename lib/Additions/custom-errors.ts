export class CustomTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class CustomAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbortError";
  }
}

export class CustomNetworkError extends Error {
  statusCode: number;
  constructor(statusCode: number, statusText: string) {
    super(statusText);
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}

export class DisplayError extends Error {
  // To mark an error as one we want to display in a notification window to the user
  constructor(message: string) {
    super(message);
    this.name = "DisplayError";
  }
}
