import chalk from "chalk"

const priorityStyle = { low: chalk.green, medium: chalk.yellow, high: chalk.red }
const terminalWidth = () => Math.max(48, process.stdout.columns || 80)
const line = (width = terminalWidth()) => chalk.dim("─".repeat(width - 2))
const truncate = (value, width) => value.length > width ? value.slice(0, Math.max(1, width - 1)) + "…" : value
const visibleLength = (value) => value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").length
const pad = (value, width) => value + " ".repeat(Math.max(0, width - visibleLength(value)))

export function isOverdue(todo, today = new Date().toISOString().slice(0, 10)) {
  return todo.status === "active" && Boolean(todo.dueDate) && todo.dueDate < today
}

export function displayDate(date) {
  if (!date) return chalk.dim("—")
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"))
}

function status(todo) {
  if (isOverdue(todo)) return { icon: chalk.red("!"), label: chalk.red("OVERDUE") }
  if (todo.status === "completed") return { icon: chalk.green("●"), label: chalk.green("DONE") }
  return { icon: chalk.cyan("○"), label: chalk.cyan("ACTIVE") }
}

function todoTitle(todo, width) {
  const value = truncate(todo.title, width)
  return todo.status === "completed" ? chalk.dim.strikethrough(value) : value
}

export function heading(title, subtitle) {
  return [chalk.cyan.bold(title), subtitle ? chalk.dim(subtitle) : null, line()].filter(Boolean).join("\n")
}

export function formatTodo(todo) {
  const currentStatus = status(todo)
  return currentStatus.icon + " " + chalk.dim(todo.id) + "  " + todoTitle(todo, 42) + "  " + priorityStyle[todo.priority](todo.priority.toUpperCase()) + "  " + displayDate(todo.dueDate)
}

export function formatTodoList(todos, filters = {}, label = "TODO LIST") {
  const width = terminalWidth()
  const active = todos.filter((todo) => todo.status === "active").length
  const completed = todos.length - active
  const filterSummary = [
    filters.status && "Status: " + filters.status,
    filters.priority && "Priority: " + filters.priority,
    filters.tag && "Tag: #" + filters.tag,
    filters.due && "Due: " + filters.due,
    filters.dueBefore && "Due ≤ " + filters.dueBefore,
    filters.dueAfter && "Due ≥ " + filters.dueAfter,
    filters.overdue && "Overdue",
    filters.sort && filters.sort !== "created" && "Sort: " + filters.sort,
  ].filter(Boolean).join("  •  ")
  if (!todos.length) return [heading(label, filterSummary), chalk.dim("  No todos found.")].join("\n")

  const compact = width < 68
  const titleWidth = compact ? Math.max(16, width - 35) : Math.max(24, width - 45)
  const rows = todos.map((todo) => {
    const currentStatus = status(todo)
    const due = todo.dueDate ? displayDate(todo.dueDate) : chalk.dim("—")
    if (compact) return "  " + currentStatus.icon + " " + chalk.dim(todo.id) + "  " + todoTitle(todo, titleWidth) + "  " + priorityStyle[todo.priority](todo.priority[0].toUpperCase()) + "  " + due
    return "  " + pad(currentStatus.icon + " " + chalk.dim(todo.id), 14) + " " + pad(todoTitle(todo, titleWidth), titleWidth) + " " + pad(priorityStyle[todo.priority](todo.priority.toUpperCase()), 10) + " " + due
  })
  const columns = compact ? "  STATUS/ID       TITLE                 P  DUE" : "  STATUS / ID     " + pad("TITLE", titleWidth) + " PRIORITY   DUE"
  const footer = todos.length + " total  •  " + active + " active  •  " + completed + " completed"
  return [heading(label, filterSummary), chalk.dim(columns), chalk.dim("  " + "─".repeat(Math.max(36, width - 4))), ...rows, "", chalk.dim("  " + footer)].join("\n")
}

export function formatDetails(todo) {
  const width = Math.min(Math.max(48, terminalWidth() - 2), 84)
  const inner = width - 4
  const currentStatus = status(todo)
  const rows = [
    todo.title,
    todo.description || chalk.dim("No description"),
    "",
    "Status    " + currentStatus.label,
    "Priority  " + priorityStyle[todo.priority](todo.priority[0].toUpperCase() + todo.priority.slice(1)),
    "Due       " + (isOverdue(todo) ? chalk.red(displayDate(todo.dueDate)) : displayDate(todo.dueDate)),
    "Tags      " + (todo.tags.length ? todo.tags.map((tag) => chalk.cyan("#" + tag)).join(" ") : chalk.dim("—")),
    "Created   " + chalk.dim(todo.createdAt.slice(0, 10)),
    "Updated   " + chalk.dim(todo.updatedAt.slice(0, 10)),
  ]
  if (todo.completedAt) {
    rows.push("Completed " + chalk.dim(todo.completedAt.slice(0, 10)))
  }
  const boxRow = (value = "") => "│ " + pad(truncate(value, inner), inner) + " │"
  return [
    chalk.cyan("┌" + "─".repeat(width - 2) + "┐"),
    chalk.cyan(boxRow(chalk.bold("TODO"))),
    chalk.cyan("├" + "─".repeat(width - 2) + "┤"),
    ...rows.map(boxRow),
    chalk.cyan("└" + "─".repeat(width - 2) + "┘"),
  ].join("\n")
}

export function success(title, detail) {
  return [chalk.green.bold("✓ " + title), detail ? "\n  " + detail : null].filter(Boolean).join("\n")
}

export function errorMessage(message, detail) {
  return [chalk.red.bold("✗ " + message), detail ? chalk.dim("  " + detail) : null].filter(Boolean).join("\n")
}
