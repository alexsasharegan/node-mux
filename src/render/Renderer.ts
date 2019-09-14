import { Task } from "safe-types";
import qs from "querystring";
import { Context } from "../Context";
import * as ContentTypes from "../content-type";
import * as enc from "../x-encoding";

export interface Renderer<E = Error> {
  render(ctx: Context): Task<void, E>;
}

type JSONReplacer = (this: any, key: string, value: any) => any;

class BaseRenderer implements Renderer<Error>, enc.Serializeable {
  public contentType: ContentTypes.XContentType;
  public data: any;

  render(ctx: Context) {
    return this.serialize().and_then(chunk => {
      ctx.response.setHeader("Content-Type", this.contentType.toString());
      ctx.response.setHeader("Content-Length", chunk.byteLength);

      return new Task<void, Error>(({ Ok, Err }) => {
        ctx.response.write(chunk, "utf8", function onWriteJSON(error) {
          if (error) {
            return Err(error);
          }

          Ok();
        });
      });
    });
  }

  serialize(): Task<Buffer, Error> {
    throw new TypeError(`Must implement serialize in subclass.`);
  }
}

export class JSONRenderer<T> extends BaseRenderer {
  public contentType = new ContentTypes.JSON();
  public replacer?: JSONReplacer;

  constructor(public data: T, options: { replacer?: JSONReplacer }) {
    super();
    if (options.replacer) {
      this.replacer = options.replacer;
    }
  }

  serialize() {
    return enc.serializeJSON(this.data, this.replacer);
  }
}

export class FormUrlEncodedRenderer extends BaseRenderer {
  public contentType = new ContentTypes.FormUrlEncoded();

  constructor(
    public data: qs.ParsedUrlQueryInput,
    public options?: qs.StringifyOptions
  ) {
    super();
  }

  serialize() {
    return enc.serializeFormUrlEncoded(this.data, this.options);
  }
}

export class PlainTextRenderer extends BaseRenderer {
  public contentType = new ContentTypes.PlainText();

  constructor(public data: string) {
    super();
  }

  serialize() {
    return new Task<Buffer, never>(({ Ok }) => {
      Ok(Buffer.from(this.data, "utf-8"));
    });
  }
}

export class RawDataRenderer extends BaseRenderer {
  public contentType = new ContentTypes.RawData();

  constructor(public data: Buffer) {
    super();
  }

  serialize() {
    return Task.of_ok(this.data);
  }
}

export class HTMLRenderer extends BaseRenderer {
  public contentType = new ContentTypes.HTML();

  constructor(public data: Buffer | string) {
    super();
  }

  serialize() {
    let data =
      typeof this.data === "string"
        ? Buffer.from(this.data, "utf-8")
        : this.data;

    return Task.of_ok(data);
  }
}

export class XMLRenderer extends BaseRenderer {
  public contentType = new ContentTypes.XML();

  constructor(public data: Buffer | string) {
    super();
  }

  serialize() {
    let data =
      typeof this.data === "string"
        ? Buffer.from(this.data, "utf-8")
        : this.data;

    return Task.of_ok(data);
  }
}
