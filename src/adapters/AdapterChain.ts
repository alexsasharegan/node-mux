import { Adapter, Handler } from "../contracts";
import { pipeAdapters } from "./compose";

export class AdapterChain {
  constructor(public adapters: Adapter[]) {}

  adapt(h: Handler): Handler {
    return pipeAdapters(h, this.adapters);
  }
}
