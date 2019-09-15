import { RequestListener, IncomingMessage } from "http";
import { LogManager, LogLevel } from "../log";
import { Handler } from "../contracts";
import { StatusCode, NotFoundResponse } from "../response";

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
  entriesByPath: Record<string, MuxEntry> = {};
  entries: MuxEntry[] = [];

  serveHTTP: RequestListener = async (request, response) => {
    if (request.url == "*") {
      response.writeHead(StatusCode.BadRequest);
      await new Promise((resolve) => {
        response.end(() => resolve());
      });
      return;
    }

    let handler = this.handler(request);
  };

  protected handler(request: IncomingMessage) {
    if (request.method === "CONNECT") {
      // If r.URL.Path is /tree and its handler is not registered,
      // the /tree -> /tree/ redirect applies to CONNECT requests
      // but the path canonicalization does not.
      // if u, ok := mux.redirectToPathSlash(r.URL.Host, r.URL.Path, r.URL); ok {
      // 	return RedirectHandler(u.String(), StatusMovedPermanently), u.Path
      // }
      // return mux.handler(r.Host, r.URL.Path)
    }
  }

  protected match(path: string): { handler: Handler; pattern: string } {
    let entry = this.entriesByPath[path];
    if (entry) {
      return {
        handler: entry.handler,
        pattern: entry.pattern,
      };
    }

    for (let entry of this.entries) {
      if (entry.pattern.startsWith(path)) {
        return {
          handler: entry.handler,
          pattern: entry.pattern,
        };
      }
    }

    return {
      handler: new NotFoundResponse(),
      pattern: "",
    };
  }
}

class MuxEntry {
  constructor(public pattern: string, public handler: Handler) {}
}
