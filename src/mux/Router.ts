import url from "url";
import path from "path";
import { Handler, HandleFunc, Request, Adapter } from "../contracts";
import { StatusCode, RedirectHandler, DefaultNotFoundHandler, endResponse } from "../response";
import { HTTPHandler } from "../Handler";
import { pipeAdapters } from "../adapters";
import { AnyMethod, Method, methodMap } from "../request/methods";

export class Router {
  protected byPattern: Map<string, Route> = new Map();
  protected byMethod: Map<number, Route[]> = new Map();
  /**
   * Entries with trailing slashes sorted from longest to shortest.
   */
  protected entries: Route[] = [];

  constructor(public readonly mountPath: string) {}

  public serveHTTP: HandleFunc = async (rx, wx) => {
    if (rx.url == "*") {
      wx.writeHead(StatusCode.BadRequest);
      await endResponse(wx);
      return;
    }

    let { handler } = this.handler(rx);
    await handler.serveHTTP(rx, wx);
  };

  /**
   * Register adapters (middleware) on the Router.
   * This means they will be run before any routes.
   */
  public useAdapters(...adapters: Adapter[]): this {
    let h = pipeAdapters(this, adapters);
    this.serveHTTP = h.serveHTTP.bind(h);
    return this;
  }

  /**
   * Starts a route builder context with a set of given adapters (middleware).
   */
  public withAdapters(...adapters: Adapter[]): RouteBuilderContext<this> {
    return new RouteBuilder(this, adapters);
  }

  // #region method registration aliases

  public all(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), AnyMethod);
  }

  public get(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Get]);
  }

  public head(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Head]);
  }

  public post(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Post]);
  }

  public put(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Put]);
  }

  public patch(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Patch]);
  }

  public delete(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Delete]);
  }

  public connect(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Connect]);
  }

  public options(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Options]);
  }

  public trace(pattern: string, f: HandleFunc): this {
    return this.registerHandler(pattern, new HTTPHandler(f), methodMap[Method.Trace]);
  }

  // #endregion

  public registerHandler(pattern: string, handler: Handler, method: number): this {
    this.validatePattern(pattern);

    let entry = new Route(pattern, handler, method);
    this.byPattern.set(pattern, entry);

    let methodEntries = this.byMethod.get(method) || [];
    this.byMethod.set(method, methodEntries);

    this.appendSorted(entry);

    return this;
  }

  protected validatePattern(pattern: string) {
    if (pattern === "") {
      throw new TypeError(`Invalid pattern`);
    }

    if (this.byPattern.has(pattern)) {
      throw new Error(`Multiple registrations for ${pattern}`);
    }
  }

  protected appendSorted(entry: Route) {
    let p = entry.pattern;
    if (!p.endsWith("/")) {
      return;
    }

    let n = this.entries.length;
    let i = this.entries.findIndex(({ pattern }) => pattern.length < p.length);
    if (i === -1 || i == n - 1) {
      this.entries.push(entry);
    } else {
      this.entries.splice(i, 0, entry);
    }
  }

  /**
   * Handler returns the handler to use for the given request,
   * consulting request.method and request.url. It always returns
   * a handler. If the path is not in its canonical form, the
   * handler will be an internally-generated handler that redirects
   * to the canonical path. If the host contains a port, it is ignored
   * when matching handlers.
   * Handler also returns the registered pattern that matches the
   * request or, in the case of internally-generated redirects,
   * the pattern that will match after following the redirect.
   * If there is no registered handler that applies to the request,
   * Handler returns a "page not found" handler and an empty pattern.
   */
  public handler(rx: Request): Route {
    if (typeof rx.xUrl !== "string") {
      throw new TypeError(
        `Failed to access the request url. Cannot run outside of a server context.`
      );
    }

    let u = url.parse(path.normalize(rx.xUrl));

    let rd = this.redirectToPathSlash(u);
    if (rd.redirect) {
      return new Route(
        rd.url,
        new RedirectHandler({ code: StatusCode.MovedPermanently, url: rd.url }),
        methodMap[rx.xMethod]
      );
    }

    return this.match(u.pathname || "", methodMap[rx.xMethod]);
  }

  protected match(path: string, methodFlag: number): Route {
    let entry = this.byPattern.get(path);
    if (entry) {
      return entry;
    }

    for (let entry of this.entries) {
      if (entry.pattern.startsWith(path)) {
        return entry;
      }
    }

    return new Route("", DefaultNotFoundHandler, methodFlag);
  }

  protected matchMethod(method: number): boolean {
    if (method === methodMap.HEAD && !this.byMethod.has(method)) {
      method = methodMap.GET;
    }

    return this.byMethod.has(method);
  }

  protected redirectToPathSlash(
    u: url.UrlWithStringQuery
  ): { redirect: true; url: string } | { redirect: false; url: null } {
    if (this.shouldRedirect(u.pathname || "")) {
      let q = "";
      if (u.search) {
        q = `?${new URLSearchParams(u.search)}`;
      }

      return {
        redirect: true,
        url: `${u.pathname}/${q}`,
      };
    }

    return {
      redirect: false,
      url: null,
    };
  }

  protected shouldRedirect(path: string) {
    if (this.byPattern.has(path)) {
      return false;
    }

    let n = path.length;
    if (n === 0) {
      return false;
    }

    if (this.byPattern.has(path + "/")) {
      return !path.endsWith("/");
    }

    return false;
  }
}

class Route {
  constructor(public pattern: string, public handler: Handler, public methodFlag: number) {}
}

export interface RouteBuilderContext<OriginalContext extends Router> {
  all(pattern: string, f: HandleFunc): OriginalContext;
  get(pattern: string, f: HandleFunc): OriginalContext;
  head(pattern: string, f: HandleFunc): OriginalContext;
  post(pattern: string, f: HandleFunc): OriginalContext;
  put(pattern: string, f: HandleFunc): OriginalContext;
  patch(pattern: string, f: HandleFunc): OriginalContext;
  delete(pattern: string, f: HandleFunc): OriginalContext;
  connect(pattern: string, f: HandleFunc): OriginalContext;
  options(pattern: string, f: HandleFunc): OriginalContext;
  trace(pattern: string, f: HandleFunc): OriginalContext;
}

class RouteBuilder<Root extends Router> implements RouteBuilderContext<Root> {
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
