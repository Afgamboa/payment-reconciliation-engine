export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
