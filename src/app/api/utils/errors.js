export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
  }
}
