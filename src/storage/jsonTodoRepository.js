import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { AppError } from "../errors.js"

export class JsonTodoRepository {
  constructor(filePath) { this.filePath = filePath }
  async initialize() { await mkdir(path.dirname(this.filePath), { recursive: true }) }
  async readAll() {
    await this.initialize()
    try {
      const content = await readFile(this.filePath, "utf8")
      const todos = JSON.parse(content)
      if (!Array.isArray(todos)) throw new Error("Root value is not an array")
      return todos
    } catch (error) {
      if (error.code === "ENOENT") return []
      if (error instanceof SyntaxError || error.message === "Root value is not an array") throw new AppError(`Todo storage is malformed: ${this.filePath}`)
      throw new AppError(`Unable to read todo storage: ${error.message}`)
    }
  }
  async writeAll(todos) {
    await this.initialize()
    const temporaryPath = `${this.filePath}.tmp`
    try {
      await writeFile(temporaryPath, `${JSON.stringify(todos, null, 2)}\n`, "utf8")
      await rename(temporaryPath, this.filePath)
    } catch (error) { throw new AppError(`Unable to save todo storage: ${error.message}`) }
  }
}
