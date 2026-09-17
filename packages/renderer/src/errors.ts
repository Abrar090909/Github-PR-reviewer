export type RenderErrorCode =
  | "UNKNOWN_VIEW"
  | "LENS_NOT_DECLARED"
  | "NOTHING_TO_RENDER"
  | "NO_FLOW_IN_SCOPE"
  | "TOO_MANY_ASSETS";

export class ContourRenderError extends Error {
  readonly code: RenderErrorCode;

  constructor(code: RenderErrorCode, message: string) {
    super(message);
    this.name = "ContourRenderError";
    this.code = code;
  }
}
