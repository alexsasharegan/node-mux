import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "./log/contracts";
import { Renderer } from "./render/Renderer";

export interface Context {
  request: IncomingMessage;
  response: ServerResponse;

  logger: Logger;
  respond(renderer: Renderer): Promise<void>;
}
