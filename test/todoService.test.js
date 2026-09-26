import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { AppError, NotFoundError } from "../src/errors.js"
import { JsonTodoRepository } from "../src/storage/jsonTodoRepository.js"
import { TodoService } from "../src/services/todoService.js"

async function setup() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "todo-cli-"))
  const repository = new JsonTodoRepository(path.join(directory, "nested", "todos.json"))
  let tick = 0
  const service = new TodoService(repository, () => new Date(`2026-01-0${++tick}T10:00:00.000Z`))
  return { service, repository }
}

test("creates and persists a todo with normalized fields", async () => {
  const { service, repository } = await setup()
  const created = await service.create({ title: " Learn DSA ", description: "Arrays", priority: "HIGH", dueDate: "2026-02-10", tags: ["Study", "study"] })
  assert.equal(created.title, "Learn DSA")
  assert.deepEqual(created.tags, ["study"])
  assert.equal((await repository.readAll()).length, 1)
})

test("updates, completes, reopens, and deletes a todo", async () => {
  const { service } = await setup()
  const created = await service.create({ title: "Draft README", description: "Keep this", dueDate: "2026-04-01", tags: ["docs"] })
  const updated = await service.update(created.id, { title: "Ship README", priority: "high" })
  assert.equal(updated.title, "Ship README")
  assert.equal(updated.description, "Keep this")
  assert.equal(updated.dueDate, "2026-04-01")
  assert.deepEqual(updated.tags, ["docs"])
  assert.equal((await service.setCompleted(created.id, true)).status, "completed")
  assert.equal((await service.setCompleted(created.id, false)).status, "active")
  assert.equal((await service.remove(created.id)).id, created.id)
  await assert.rejects(() => service.get(created.id), NotFoundError)
})

test("filters, searches, and sorts todos", async () => {
  const { service } = await setup()
  await service.create({ title: "Study algorithms", description: "Graphs", priority: "low", tags: ["study"], dueDate: "2026-03-01" })
  const second = await service.create({ title: "Ship feature", priority: "high", tags: ["work"], dueDate: "2026-02-01" })
  await service.setCompleted(second.id, true)
  assert.equal((await service.list({ status: "completed" })).length, 1)
  assert.equal((await service.list({ tag: "study" }))[0].title, "Study algorithms")
  assert.equal((await service.list({ search: "graphs" }))[0].title, "Study algorithms")
  assert.equal((await service.list({ sort: "priority" }))[0].priority, "high")
  assert.equal((await service.list({ dueBefore: "2026-02-15" })).length, 1)
})

test("rejects invalid input and missing todos", async () => {
  const { service } = await setup()
  await assert.rejects(() => service.create({ title: "   " }), AppError)
  await assert.rejects(() => service.create({ title: "Bad date", dueDate: "tomorrow" }), AppError)
  await assert.rejects(() => service.list({ sort: "random" }), /Sort must be one of/)
  await assert.rejects(() => service.get("missing"), NotFoundError)
})

test("filters overdue todos with deterministic clock", async () => {
  const { service } = await setup()
  // Mock today as 2026-01-05
  service.clock = () => new Date("2026-01-05T10:00:00.000Z")
  const pastDue = await service.create({ title: "Past Due", dueDate: "2026-01-01" })
  const dueToday = await service.create({ title: "Due Today", dueDate: "2026-01-05" })
  const futureDue = await service.create({ title: "Future", dueDate: "2026-01-10" })
  const completedPastDue = await service.create({ title: "Done Past Due", dueDate: "2026-01-01" })
  await service.setCompleted(completedPastDue.id, true)

  const overdueList = await service.list({ overdue: true })
  assert.equal(overdueList.length, 1)
  assert.equal(overdueList[0].id, pastDue.id)
})

test("rejects non-string priority values on create and update", async () => {
  const { service } = await setup()
  await assert.rejects(() => service.create({ title: "Test", priority: null }), AppError)
  await assert.rejects(() => service.create({ title: "Test", priority: 42 }), AppError)
  await assert.rejects(() => service.create({ title: "Test", priority: true }), AppError)
  
  const todo = await service.create({ title: "Test", priority: "medium" })
  await assert.rejects(() => service.update(todo.id, { priority: null }), AppError)
  await assert.rejects(() => service.update(todo.id, { priority: 42 }), AppError)
})

test("missing storage initializes as empty and malformed storage is reported", async () => {
  const { repository } = await setup()
  assert.deepEqual(await repository.readAll(), [])
  await writeFile(repository.filePath, "{broken", "utf8")
  await assert.rejects(() => repository.readAll(), /malformed/)
})

test("writes valid JSON that can be read back", async () => {
  const { service, repository } = await setup()
  await service.create({ title: "Persist me" })
  const raw = JSON.parse(await readFile(repository.filePath, "utf8"))
  assert.equal(raw[0].title, "Persist me")
})
