export interface SecretOptions {
  label?: string;
  maskChar?: string;
  maskLength?: number;
}

/**
 * Secret is class that wraps a secret value
 * so that it cannot be exposed in logging.
 */
export class Secret<T> {
  public label: string;
  public maskChar: string;
  public maskLength: number;

  constructor(protected value: T, options: SecretOptions = {}) {
    let { label = "Secret", maskChar = "*", maskLength = 6 } = options;
    this.label = label;
    this.maskChar = maskChar;
    this.maskLength = maskLength;
  }

  public get secret(): T {
    return this.value;
  }
  public set secret(value: T) {
    this.value = value;
  }

  protected get mask(): string {
    return this.maskChar.repeat(this.maskLength);
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }

  toString(): string {
    return `${this.label}<${this.mask}>`;
  }

  toJSON() {
    return this.toString();
  }
}
