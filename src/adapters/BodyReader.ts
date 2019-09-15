import { Adapter, Handler, Request } from "../contracts";
import { HTTPHandler } from "../Handler";
import { JSONError } from "../errors/HTTPError";
import { StatusCode } from "../response";
import { toBytes } from "../bytes";
import { DeserializeFunc, deserializeJSON, ConcatFunc } from "../x-encoding";

export type ReaderFunc = (rx: Request) => Promise<void>;

export interface BodyReaderParams {
  /**
   * Defaults to 'utf8'.
   */
  encoding?: string;
  /**
   * Maximum bytes allowed.
   * Defaults to 100KiB.
   */
  limit?: number;
}

abstract class BodyReader implements Adapter {
  encoding: string;
  limit: number;

  constructor({ encoding = "utf8", limit = toBytes(100, "KiB") }: BodyReaderParams) {
    this.encoding = encoding;
    this.limit = limit;
  }

  public shouldRead(_: Request): boolean {
    return false;
  }

  public async read(rx: Request) {
    rx.body = {};
  }

  public adapt(h: Handler): Handler {
    return new HTTPHandler(async (rx, wx) => {
      if (this.shouldRead(rx)) {
        await this.read(rx);
      }
      await h.serveHTTP(rx, wx);
    });
  }
}

export interface StreamedReaderParams<T> extends BodyReaderParams {
  deserialize: DeserializeFunc<T>;
  concat: ConcatFunc<T>;
  initial: T;
}

export class StreamedReader<T> extends BodyReader {
  public byteLength = 0;
  public accumulator: T;
  public deserialize: DeserializeFunc<T>;
  public concat: ConcatFunc<T>;

  constructor({ deserialize, concat, initial, ...params }: StreamedReaderParams<T>) {
    super(params);
    this.concat = concat;
    this.deserialize = deserialize;
    this.accumulator = initial;
  }

  async read(rx: Request) {
    rx.body = await this.consume(rx);
  }

  protected consume(rx: Request): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      rx.on("error", (error) => {
        rx.pause();
        rx.unpipe();
        reject(error);
      });

      rx.on("data", async (chunk) => {
        let buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        this.byteLength += buf.byteLength;

        if (this.byteLength > this.limit) {
          rx.emit(
            "error",
            new JSONError({
              code: StatusCode.RequestEntityTooLarge,
              message: `request entity too large`,
            })
          );
          return;
        }

        try {
          let decoded = this.deserialize(buf, this.encoding);
          this.accumulator = this.concat(this.accumulator, decoded);
        } catch (error) {
          new JSONError({
            code: StatusCode.UnprocessableEntity,
            message: `malformed request`,
            previous: error,
          });
        }
      });

      rx.on("end", () => {
        resolve(this.accumulator);
      });
    });
  }
}

export class BufferedReader extends StreamedReader<Buffer[]> {
  finalDecoder: DeserializeFunc;
  constructor({ deserialize, ...params }: BodyReaderParams & { deserialize: DeserializeFunc }) {
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

export class JSONReader extends BufferedReader {
  constructor(params: BodyReaderParams) {
    super({ ...params, deserialize: deserializeJSON });
  }

  shouldRead(rx: Request) {
    let ct = rx.headers["content-type"] || "";
    return ct.toLowerCase().startsWith("application/json");
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
}
