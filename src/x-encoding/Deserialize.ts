export interface Deserializeable<T = any> {
  deserialize(chunk: Buffer | string): Promise<T>;
}
