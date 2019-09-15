export class WrappedError<ErrKind = any> extends Error implements Iterable<WrappedError | ErrKind> {
  previous: ErrKind | null = null;
  code: number | string = 0;

  constructor(
    message: string,
    params: {
      code?: number | string;
      previous?: ErrKind;
    } = {}
  ) {
    super(message);

    // We update the error's name to distinguish it from the base Error.
    this.name = this.constructor.name;

    // We add our reference to the original error value (if provided).
    if (params.previous != null) {
      this.previous = params.previous;
    }

    if (params.code != null) {
      this.code = params.code;
    }
  }

  /**
   * Iterate through the error stack from head to tail (most recent to root error).
   */
  *[Symbol.iterator](): Iterator<WrappedError | ErrKind> {
    let err: any = this;

    for (; err instanceof WrappedError; err = err.previous) {
      yield err;
    }

    if (err != null) {
      yield err;
    }
  }

  *messageValues(): IterableIterator<string> {
    for (let error of this) {
      if (error instanceof Error) {
        yield error.message;
      } else {
        yield String(error);
      }
    }
  }

  /**
   * The original error value.
   */
  get root(): WrappedError<null> | ErrKind {
    // Base case, no child === this instance is root
    if (this.previous == null) {
      return this as any;
    }
    // When the child is another node, compute recursively
    if (this.previous instanceof WrappedError) {
      return this.previous.root;
    }
    // This instance wraps the original error
    return this.previous;
  }

  /**
   * An array of all the stringified, non-nullable error messages.
   */
  get spans(): string[] {
    return Array.from(this.messageValues());
  }
}
