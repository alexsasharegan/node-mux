export enum ContentType {
  Custom,

  FormUrlEncoded,
  HTML,
  JSON,
  PlainText,
  RawData,
  XML,
}

export class XContentType {
  constructor(public readonly type: ContentType) {}

  toString(): string {
    switch (this.type) {
      default:
        throw new TypeError(`Unknown content type: ${this.type}`);

      case ContentType.Custom:
        throw new Error(`Custom content must override the toString method.`);

      case ContentType.FormUrlEncoded:
        return "application/x-www-form-urlencoded; charset=utf-8";
      case ContentType.HTML:
        return "text/html; charset=utf-8";
      case ContentType.JSON:
        return "application/json; charset=utf-8";
      case ContentType.PlainText:
        return "text/plain; charset=utf-8";
      case ContentType.RawData:
        return "application/octet-stream";
      case ContentType.XML:
        return "application/xml; charset=utf-8";
    }
  }

  get baseString(): string {
    switch (this.type) {
      default:
        throw new TypeError(`Unknown content type: ${this.type}`);

      case ContentType.Custom:
        throw new Error(`Custom content must override the toString method.`);

      case ContentType.FormUrlEncoded:
        return "application/x-www-form-urlencoded";
      case ContentType.HTML:
        return "text/html";
      case ContentType.JSON:
        return "application/json";
      case ContentType.PlainText:
        return "text/plain";
      case ContentType.RawData:
        return "application/octet-stream";
      case ContentType.XML:
        return "application/xml";
    }
  }
}

class $FormUrlEncoded extends XContentType {
  constructor() {
    super(ContentType.FormUrlEncoded);
  }
}

class $HTML extends XContentType {
  constructor() {
    super(ContentType.HTML);
  }
}

class $JSON extends XContentType {
  constructor() {
    super(ContentType.JSON);
  }
}

class $PlainText extends XContentType {
  constructor() {
    super(ContentType.PlainText);
  }
}

class $RawData extends XContentType {
  constructor() {
    super(ContentType.RawData);
  }
}

class $XML extends XContentType {
  constructor() {
    super(ContentType.XML);
  }
}

export class Custom extends XContentType {
  constructor(public headerValue: string) {
    super(ContentType.Custom);
  }

  toString() {
    return this.headerValue;
  }

  get baseString() {
    return this.headerValue;
  }
}

export const FormUrlEncoded: XContentType = new $FormUrlEncoded();
export const HTML: XContentType = new $HTML();
export const JSON: XContentType = new $JSON();
export const PlainText: XContentType = new $PlainText();
export const RawData: XContentType = new $RawData();
export const XML: XContentType = new $XML();
