import { Adapter, Handler } from "../contracts";

export function composeMiddleware(root: Handler, adapters: Adapter[]): Handler {
  let h = root;

  for (let i = adapters.length - 1; i >= 0; i--) {
    let a = adapters[i];
    h = a(h);
  }

  return h;
}
