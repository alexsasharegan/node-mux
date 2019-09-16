import { Adapter, Handler, Request } from "../contracts";
import { HTTPHandler } from "../Handler";
import { JSONError } from "../errors/HTTPError";
import { StatusCode } from "../response";
import { toBytes } from "../bytes";
import { DeserializeFunc, deserializeJSON, ConcatFunc } from "../x-encoding";
import * as Ct from "../content-type";

export type ReaderFunc = (rx: Request) => Promise<void>;

export interface BodyReaderParams {
  /**
   * Defaults to 'utf8'.
   */
  encoding?: string;
  /**
   * Maximum bytes allowed.
   * Defaults to 100KiB.
   *
   * If the limit is exceeded,
   * a JSON 413 RequestEntityTooLarge error is thrown (implements `Handler`).
   */
  limit?: number;
}

/**
 * BodyReader is an Adapter type that reads the request body into memory
 * when the content type matches (or any other custom conditions).
 */
abstract class BodyReader implements Adapter {
  encoding: string;
  limit: number;

  constructor({ encoding = "utf8", limit = toBytes(100, "KiB") }: BodyReaderParams) {
    this.encoding = encoding;
    this.limit = limit;
  }

  /**
   * shouldRead returns whether or not this BodyReader instance
   * should claim responsibility for reading this request.
   *
   * Implementors should perform a Content-Type header check.
   */
  public shouldRead(_: Request): boolean {
    throw new TypeError(`Subclass must implement 'shouldRead'`);
  }

  public async read(_: Request) {
    throw new TypeError(`Subclass must implement 'read'`);
  }

  public adapt(h: Handler): Handler {
    return new HTTPHandler(async (rx, wx) => {
      // @ts-ignore available in Node 12.9.0, but safe to try here.
      let ended: boolean = rx.readableEnded || false;

      /**
       * The request should be read when:
       * - this reader matches shouldRead (content-type & custom conditions)
       * - the request has not ended
       * - another reader has not already consumed the request
       */
      if (this.shouldRead(rx) && !ended && !rx.bodyConsumed) {
        await this.read(rx);
        // Mark the request body consumed for other readers.
        rx.bodyConsumed = true;
      }

      await h.serveHTTP(rx, wx);
    });
  }
}

export interface StreamedReaderParams<T> extends BodyReaderParams {
  initial: T;
  deserialize: DeserializeFunc<T>;
  concat: ConcatFunc<T>;
}

/**
 * `StreamedReader` implements BodyReader by consuming the request body stream
 * and concatenating the decoded chunks.
 */
export class StreamedReader<T> extends BodyReader {
  public bytesReceived = 0;
  public accumulator: T;
  public deserialize: DeserializeFunc<T>;
  public concat: ConcatFunc<T>;

  constructor({ deserialize, concat, initial, ...params }: StreamedReaderParams<T>) {
    super(params);
    this.accumulator = initial;
    this.deserialize = deserialize;
    this.concat = concat;
  }

  async read(rx: Request) {
    rx.body = await this.consume(rx);
  }

  /**
   * `consume` reads the request body,
   * ensures the payload does not exceed the limit,
   * and applies the decoders and concatenation of the streamed value.
   */
  protected async consume(rx: Request): Promise<T> {
    try {
      for await (let chunk of rx) {
        let buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        this.bytesReceived += buf.byteLength;

        if (this.bytesReceived > this.limit) {
          // Bail out consuming the stream and throw a Handler Error.
          throw new JSONError({
            code: StatusCode.RequestEntityTooLarge,
            message: `request entity too large`,
          });
        }

        try {
          let decoded = this.deserialize(buf, this.encoding);
          this.accumulator = this.concat(this.accumulator, decoded);
        } catch (error) {
          // Transform whatever the raw error type is into a Handler Error.
          throw new JSONError({
            code: StatusCode.UnprocessableEntity,
            message: `malformed request`,
            previous: error,
          });
        }
      }
    } catch (error) {
      rx.pause();
      rx.unpipe();
      throw error;
    }

    return this.accumulator;
  }
}

/**
 * `BufferedReader` streams the request body and applies the decoder
 * once the body has been successfully consumed. Use this for types
 * that cannot be streamed-decoded.
 */
export class BufferedReader<T = any> extends StreamedReader<Buffer[]> {
  finalDecoder: DeserializeFunc<T>;

  constructor({ deserialize, ...params }: BodyReaderParams & { deserialize: DeserializeFunc<T> }) {
    super({
      ...params,
      initial: [],
      deserialize: (chunk) => [chunk],
      concat: (a, b) => a.concat(b),
    });

    this.finalDecoder = deserialize;
  }

  async read(rx: Request) {
    let chunks = await this.consume(rx);
    rx.body = this.finalDecoder(Buffer.concat(chunks), this.encoding);
  }
}

/**
 * `JSONReader` decodes a JSON request body only when
 * the request's content type is application/json.
 */
export class JSONReader extends BufferedReader {
  constructor(params: BodyReaderParams) {
    super({ ...params, deserialize: deserializeJSON });
  }

  shouldRead(rx: Request) {
    let ct = rx.headers["content-type"] || "";
    return ct.toLowerCase().startsWith(Ct.JSON.baseString);
  }
}

export class PlainTextReader extends StreamedReader<string> {
  constructor(params: BodyReaderParams) {
    super({
      ...params,
      initial: "",
      deserialize: (buf) => buf.toString(params.encoding),
      concat: (a, b) => a + b,
    });
  }

  shouldRead(rx: Request) {
    let ct = rx.headers["content-type"] || "";
    return ct.toLowerCase().startsWith(Ct.PlainText.baseString);
  }
}
