import { IncomingMessage, ServerResponse } from "http";
import url from "url";
import { LogManager, LogLevel } from "../log";
import { Handler, HandleFunc } from "../contracts";
import { StatusCode, NotFoundHandler, RedirectHandler } from "../response";
import { endResponse } from "../response/helpers";
import { HTTPHandler } from "../Handler";

export type Pattern = string;

/**
 * ServeMux is an HTTP request multiplexer.
 * It matches the URL of each incoming request against a list of registered
 * patterns and calls the handler for the pattern that
 * most closely matches the URL.
 * Patterns name fixed, rooted paths, like "/favicon.ico",
 * or rooted subtrees, like "/images/" (note the trailing slash).
 * Longer patterns take precedence over shorter ones, so that
 * if there are handlers registered for both "/images/"
 * and "/images/thumbnails/", the latter handler will be
 * called for paths beginning "/images/thumbnails/" and the
 * former will receive requests for any other paths in the
 * "/images/" subtree.
 * Note that since a pattern ending in a slash names a rooted subtree,
 * the pattern "/" matches all paths not matched by other registered
 * patterns, not just the URL with Path == "/".
 * If a subtree has been registered and a request is received naming the
 * subtree root without its trailing slash, ServeMux redirects that
 * request to the subtree root (adding the trailing slash). This behavior can
 * be overridden with a separate registration for the path without
 * the trailing slash. For example, registering "/images/" causes ServeMux
 * to redirect a request for "/images" to "/images/", unless "/images" has
 * been registered separately.
 * Patterns may optionally begin with a host name, restricting matches to
 * URLs on that host only. Host-specific patterns take precedence over
 * general patterns, so that a handler might register for the two patterns
 * "/codesearch" and "codesearch.google.com/" without also taking over
 * requests for "http://www.google.com/".
 * ServeMux also takes care of sanitizing the URL request path and the Host
 * header, stripping the port number and redirecting any request containing . or
 * .. elements or repeated slashes to an equivalent, cleaner URL.
 */
export class ServeMux {
  logManager: LogManager = new LogManager(LogLevel.All);
  entriesByPattern: Record<string, MuxEntry> = {};
  /**
   * Entries with trailing slashes sorted from longest to shortest.
   */
  entries: MuxEntry[] = [];

  async serveHTTP(request: IncomingMessage, response: ServerResponse) {
    if (request.url == "*") {
      response.writeHead(StatusCode.BadRequest);
      await endResponse(response);
      return;
    }

    let { handler } = this.handler(request);
    await handler.serveHTTP(request, response);
  }

  public register(pattern: Pattern, handlerFunc: HandleFunc) {
    this.registerHandler(pattern, new HTTPHandler(handlerFunc));
  }

  public registerHandler(pattern: Pattern, handler: Handler) {
    this.validatePattern(pattern);

    let entry = new MuxEntry(pattern, handler);
    this.entriesByPattern[pattern] = entry;
    this.appendSorted(entry);
  }

  protected validatePattern(pattern: Pattern) {
    if (pattern === "") {
      throw new TypeError(`Invalid pattern`);
    }

    if (this.entriesByPattern.hasOwnProperty(pattern)) {
      throw new Error(`Multiple registrations for ${pattern}`);
    }
  }

  protected appendSorted(entry: MuxEntry) {
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
  public handler(request: IncomingMessage): { handler: Handler; pattern: Pattern } {
    let originalUrl = request.url;
    if (typeof originalUrl !== "string") {
      throw new TypeError(
        `Failed to access the request url. Cannot run outside of a server context.`
      );
    }

    let u = url.parse(originalUrl);

    let rd = this.redirectToPathSlash(u);
    if (rd.redirect) {
      return {
        handler: new RedirectHandler({ code: StatusCode.MovedPermanently, url: rd.url }),
        pattern: rd.url,
      };
    }

    return this.match(u.path || "");
  }

  protected match(path: string): { handler: Handler; pattern: string } {
    let entry = this.entriesByPattern[path];
    if (entry) {
      return entry;
    }

    for (let entry of this.entries) {
      if (entry.pattern.startsWith(path)) {
        return entry;
      }
    }

    return {
      handler: new NotFoundHandler(),
      pattern: "",
    };
  }

  protected redirectToPathSlash(
    u: url.UrlWithStringQuery
  ): { redirect: true; url: string } | { redirect: false; url: null } {
    if (this.shouldRedirect(u.path || "")) {
      return {
        redirect: true,
        url: `${u.path}?${new URLSearchParams(u.search)}`,
      };
    }

    return {
      redirect: false,
      url: null,
    };
  }

  protected shouldRedirect(path: string) {
    if (this.entriesByPattern.hasOwnProperty(path)) {
      return false;
    }

    let n = path.length;
    if (n === 0) {
      return false;
    }

    if (this.entriesByPattern.hasOwnProperty(path + "/")) {
      return path[n - 1] !== "/";
    }

    return false;
  }
}

class MuxEntry {
  constructor(public pattern: string, public handler: Handler) {}
}
