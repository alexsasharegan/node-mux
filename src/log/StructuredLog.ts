import util from "util";

export class StructuredLog {
  constructor(public value: any) {}

  [util.inspect.custom](_depth: any, _options: any) {
    try {
      return JSON.stringify(this.value);
    } catch (error) {
      return String(error);
    }
  }
}
