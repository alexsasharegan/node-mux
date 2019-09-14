import { Task } from "safe-types";

export interface Deserializeable<T = any> {
  deserialize(chunk: Buffer | string): Task<T, Error>;
}
