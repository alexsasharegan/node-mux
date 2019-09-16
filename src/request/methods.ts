export enum Method {
  Get = "GET",
  Head = "HEAD",
  Post = "POST",
  Put = "PUT",
  // RFC 5789
  Patch = "PATCH",
  Delete = "DELETE",
  Connect = "CONNECT",
  Options = "OPTIONS",
  Trace = "TRACE",
}

export const enum MethodFlag {
  Stub = 0,

  Connect = 1 << 0,
  Delete = 1 << 1,
  Get = 1 << 2,
  Head = 1 << 3,
  Options = 1 << 4,
  Patch = 1 << 5,
  Post = 1 << 6,
  Put = 1 << 7,
  Trace = 1 << 8,
}

export const AnyMethod =
  MethodFlag.Connect |
  MethodFlag.Delete |
  MethodFlag.Get |
  MethodFlag.Head |
  MethodFlag.Options |
  MethodFlag.Patch |
  MethodFlag.Post |
  MethodFlag.Put |
  MethodFlag.Trace;

export const methodMap = {
  [Method.Connect]: MethodFlag.Connect,
  [Method.Delete]: MethodFlag.Delete,
  [Method.Get]: MethodFlag.Get,
  [Method.Head]: MethodFlag.Head,
  [Method.Options]: MethodFlag.Options,
  [Method.Patch]: MethodFlag.Patch,
  [Method.Post]: MethodFlag.Post,
  [Method.Put]: MethodFlag.Put,
  [Method.Trace]: MethodFlag.Trace,
} as const;

export function matchMethod(method: string): Method {
  switch (method.toUpperCase()) {
    default:
      throw new TypeError(`Unknown method: ${method}`);

    case Method.Connect:
      return Method.Connect;
    case Method.Delete:
      return Method.Delete;
    case Method.Get:
      return Method.Get;
    case Method.Head:
      return Method.Head;
    case Method.Options:
      return Method.Options;
    case Method.Patch:
      return Method.Patch;
    case Method.Post:
      return Method.Post;
    case Method.Put:
      return Method.Put;
    case Method.Trace:
      return Method.Trace;
  }
}
