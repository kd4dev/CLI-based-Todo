import { randomUUID } from "node:crypto"
import { AppError, NotFoundError } from "../errors.js"
import { dueDate, optionalText, priority, requiredTitle, status, tags, todoId } from "../validation.js"

export class TodoService {
  constructor(repository, clock = () => new Date()) { this.repository = repository; this.clock = clock }
  async create(input) {
    const now = this.clock().toISOString()
    const todo = { id: randomUUID().slice(0, 8), title: requiredTitle(input.title), description: optionalText(input.description, "Description") ?? "", status: "active", priority: priority(input.priority), createdAt: now, updatedAt: now, completedAt: null, dueDate: dueDate(input.dueDate), tags: tags(input.tags) }
    const todos = await this.repository.readAll(); todos.push(todo); await this.repository.writeAll(todos); return todo
  }
  async get(id) {
    const todo = (await this.repository.readAll()).find((item) => item.id === todoId(id))
    if (!todo) throw new NotFoundError(id)
    return todo
  }
  async list(filters = {}) {
    let todos = await this.repository.readAll()
    if (filters.status) todos = todos.filter((todo) => todo.status === status(filters.status))
    if (filters.priority) todos = todos.filter((todo) => todo.priority === priority(filters.priority))
    if (filters.tag) todos = todos.filter((todo) => todo.tags.includes(String(filters.tag).trim().toLowerCase()))
    if (filters.due) todos = todos.filter((todo) => todo.dueDate === dueDate(filters.due))
    if (filters.dueBefore) todos = todos.filter((todo) => todo.dueDate && todo.dueDate <= dueDate(filters.dueBefore))
    if (filters.dueAfter) todos = todos.filter((todo) => todo.dueDate && todo.dueDate >= dueDate(filters.dueAfter))
    if (filters.overdue) {
      const today = this.clock().toISOString().slice(0, 10)
      todos = todos.filter((todo) => todo.status === "active" && todo.dueDate && todo.dueDate < today)
    }
    if (filters.search) todos = this.searchIn(todos, filters.search)
    return this.sort(todos, filters.sort)
  }
  searchIn(todos, term) {
    const query = String(term).trim().toLowerCase()
    return todos.filter((todo) => [todo.title, todo.description, ...todo.tags].some((value) => value.toLowerCase().includes(query)))
  }
  sort(todos, sortBy = "created") {
    const copy = [...todos]; const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (!["created", "updated", "priority", "due", "alphabetical"].includes(sortBy)) throw new AppError("Sort must be one of: created, updated, priority, due, alphabetical.")
    return copy.sort((a, b) => {
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (sortBy === "alphabetical") return a.title.localeCompare(b.title)
      if (sortBy === "due") return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
      const field = sortBy === "updated" ? "updatedAt" : "createdAt"
      return b[field].localeCompare(a[field])
    })
  }
  async update(id, changes) {
    const todos = await this.repository.readAll(); const index = todos.findIndex((todo) => todo.id === todoId(id))
    if (index === -1) throw new NotFoundError(id)
    const current = todos[index]
    const next = { ...current, ...(changes.title !== undefined && { title: requiredTitle(changes.title) }), ...(changes.description !== undefined && { description: optionalText(changes.description, "Description") }), ...(changes.priority !== undefined && { priority: priority(changes.priority) }), ...(changes.dueDate !== undefined && { dueDate: dueDate(changes.dueDate) }), ...(changes.tags !== undefined && { tags: tags(changes.tags) }), ...(changes.status !== undefined && { status: status(changes.status) }), ...(changes.completedAt !== undefined && { completedAt: changes.completedAt }), updatedAt: this.clock().toISOString() }
    todos[index] = next; await this.repository.writeAll(todos); return next
  }
  async setCompleted(id, completed) {
    const todo = await this.get(id);
    return this.update(todo.id, {
      status: completed ? "completed" : "active",
      completedAt: completed ? this.clock().toISOString() : null
    })
  }
  async remove(id) {
    const todos = await this.repository.readAll(); const index = todos.findIndex((todo) => todo.id === todoId(id))
    if (index === -1) throw new NotFoundError(id)
    const [removed] = todos.splice(index, 1); await this.repository.writeAll(todos); return removed
  }
}
