import { AppError } from "./errors.js"

export const PRIORITIES = ["low", "medium", "high"]
export const STATUSES = ["active", "completed"]

export function requiredTitle(title) {
  if (typeof title !== "string" || !title.trim()) throw new AppError("Title cannot be empty.")
  return title.trim()
}
export function optionalText(value, field) {
  if (value === undefined) return undefined
  if (typeof value !== "string") throw new AppError(`${field} must be text.`)
  return value.trim()
}
export function priority(value = "medium") {
  const normalized = value.toLowerCase()
  if (!PRIORITIES.includes(normalized)) throw new AppError(`Priority must be one of: ${PRIORITIES.join(", ")}.`)
  return normalized
}
export function status(value = "active") {
  if (!STATUSES.includes(value)) throw new AppError(`Status must be one of: ${STATUSES.join(", ")}.`)
  return value
}
export function dueDate(value) {
  if (value === undefined || value === null || value === "") return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError("Due date must use YYYY-MM-DD format.")
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError("Due date must be a real calendar date.")
  return value
}
export function tags(value = []) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.flatMap((tag) => String(tag).split(",")).map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
}
export function todoId(id) {
  if (typeof id !== "string" || !id.trim()) throw new AppError("Todo ID cannot be empty.")
  return id.trim()
}
