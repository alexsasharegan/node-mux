import { AdapterFunc, Handler, Adapter } from "../contracts";

export function pipeAdapterFuncs(h: Handler, adapterFuncs: AdapterFunc[]): Handler {
  for (let i = adapterFuncs.length - 1; i >= 0; i--) {
    let adapterFunc = adapterFuncs[i];
    h = adapterFunc(h);
  }

  return h;
}

export function pipeAdapters(h: Handler, adapters: Adapter[]): Handler {
  for (let i = adapters.length - 1; i >= 0; i--) {
    let adapter = adapters[i];
    h = adapter.adapt(h);
  }

  return h;
}
