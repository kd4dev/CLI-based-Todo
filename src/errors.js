export class AppError extends Error {
  constructor(message, code = 1) { super(message); this.name = "AppError"; this.code = code }
}

export class NotFoundError extends AppError {
  constructor(id) { super(`Todo not found: ${id}`, 2); this.name = "NotFoundError" }
}
