import { Router } from "./Router";
import { HandleFunc, Adapter } from "../contracts";
import { HTTPHandler } from "../Handler";
import { AnyMethod, Method, methodMap } from "../request";
import { pipeAdapters } from "../adapters";

export interface RouteBuilderContext<OriginalContext extends Router> {
  /**
   * Handle requests with the given pattern for all HTTP methods.
   */
  all(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP GET.
   */
  get(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP HEAD.
   */
  head(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP POST.
   */
  post(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP PUT.
   */
  put(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP PATCH.
   */
  patch(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP DELETE.
   */
  delete(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP CONNECT.
   */
  connect(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP OPTIONS.
   */
  options(pattern: string, f: HandleFunc): OriginalContext;
  /**
   * Handle requests with the given pattern for HTTP TRACE.
   */
  trace(pattern: string, f: HandleFunc): OriginalContext;
}

export class RouteBuilder<Root extends Router> implements RouteBuilderContext<Root> {
  constructor(private ctx: Root, private adapters: Adapter[]) {}

  all(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(p, pipeAdapters(new HTTPHandler(f), this.adapters), AnyMethod);
  }
  get(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Get]
    );
  }
  head(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Head]
    );
  }
  post(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Post]
    );
  }
  put(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Put]
    );
  }
  patch(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Patch]
    );
  }
  delete(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Delete]
    );
  }
  connect(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Connect]
    );
  }
  options(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Options]
    );
  }
  trace(p: string, f: HandleFunc) {
    return this.ctx.registerHandler(
      p,
      pipeAdapters(new HTTPHandler(f), this.adapters),
      methodMap[Method.Trace]
    );
  }
}
