import React, { useCallback, useEffect, useState } from "react"
import { Box, Text, render, useApp, useInput } from "ink"
import { displayDate, isOverdue } from "../formatting.js"

const h = React.createElement
const priorities = ["low", "medium", "high"]
const sorts = ["created", "due", "priority", "alphabetical"]
const priorityColor = { low: "green", medium: "yellow", high: "red" }

function compact(value, width) {
  return value.length > width ? value.slice(0, Math.max(1, width - 1)) + "…" : value
}

function TodoRow({ todo, selected, width }) {
  const overdue = isOverdue(todo)
  const icon = overdue ? "!" : todo.status === "completed" ? "●" : "○"
  const color = overdue ? "red" : todo.status === "completed" ? "green" : "cyan"
  const titleWidth = Math.max(18, width - 36)
  return h(Box, { paddingX: 1, backgroundColor: selected ? "blue" : undefined },
    h(Text, { color }, icon + " "),
    h(Text, { dimColor: true }, todo.id + " "),
    h(Text, { strikethrough: todo.status === "completed", dimColor: todo.status === "completed" }, compact(todo.title, titleWidth)),
    h(Box, { flexGrow: 1 }),
    h(Text, { color: priorityColor[todo.priority] }, todo.priority.toUpperCase()),
    h(Text, { dimColor: true }, "  " + (todo.dueDate ? displayDate(todo.dueDate) : "—"))
  )
}

function Header({ todos, status, sort }) {
  const active = todos.filter((todo) => todo.status === "active").length
  const completed = todos.length - active
  const overdue = todos.filter(isOverdue).length
  const narrow = (process.stdout.columns || 80) < 60
  const summary = active + " active  •  " + completed + " completed  •  " + overdue + " overdue"
  return h(Box, { flexDirection: "column", marginBottom: 1 },
    h(Box, null, h(Text, { color: "cyan", bold: true }, "TODO CLI"), h(Text, { dimColor: true }, "  interactive task manager")),
    h(Text, { dimColor: true }, "─".repeat(Math.min(process.stdout.columns || 80, 80))),
    h(Text, { dimColor: true }, narrow ? summary : summary + "  |  " + (status || "all") + "  |  sort: " + sort),
    narrow ? h(Text, { dimColor: true }, "filter: " + (status || "all") + "  •  sort: " + sort) : null
  )
}

function Footer({ screen, flash }) {
  const shortcuts = screen === "form"
    ? "Tab/↑↓ fields  •  Enter next  •  Ctrl+S save  •  Esc cancel"
    : screen === "confirm"
      ? "Enter confirm  •  Esc cancel"
      : "↑↓/j k navigate  •  Enter view  •  a add  •  e edit  •  Space toggle  •  / search  •  f filter  •  s sort  •  ? help  •  q quit"
  const narrow = (process.stdout.columns || 80) < 60
  const shortcutLines = narrow && screen !== "form" && screen !== "confirm"
    ? ["↑↓ select • Enter view • a add • e edit", "Space toggle • / search • f filter • s sort", "d delete • ? help • q quit"]
    : [shortcuts]
  return h(Box, { flexDirection: "column", marginTop: 1 },
    flash ? h(Text, { color: flash.type === "error" ? "red" : "green" }, (flash.type === "error" ? "✗ " : "✓ ") + flash.message) : null,
    ...shortcutLines.map((shortcut, index) => h(Text, { key: index, dimColor: true }, shortcut))
  )
}

function Detail({ todo }) {
  if (!todo) return h(Text, { dimColor: true }, "No todo selected.")
  const overdue = isOverdue(todo)
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1, width: Math.min(process.stdout.columns || 80, 78) },
    h(Text, { bold: true }, todo.title),
    h(Text, { dimColor: true }, todo.description || "No description"),
    h(Text, null, ""),
    h(Text, null, "Status    ", h(Text, { color: overdue ? "red" : todo.status === "completed" ? "green" : "cyan" }, overdue ? "OVERDUE" : todo.status.toUpperCase())),
    h(Text, null, "Priority  ", h(Text, { color: priorityColor[todo.priority] }, todo.priority.toUpperCase())),
    h(Text, null, "Due       ", todo.dueDate ? displayDate(todo.dueDate) : "—"),
    h(Text, null, "Tags      ", todo.tags.length ? todo.tags.map((tag) => "#" + tag).join(" ") : "—"),
    h(Text, { dimColor: true }, "Created   " + todo.createdAt.slice(0, 10)),
    h(Text, { dimColor: true }, "Updated   " + todo.updatedAt.slice(0, 10))
  )
}

function Form({ initial, onSave, onCancel, error }) {
  const fields = ["title", "description", "priority", "dueDate", "tags"]
  const labels = { title: "Title", description: "Description", priority: "Priority", dueDate: "Due date", tags: "Tags" }
  const [values, setValues] = useState({
    title: initial ? initial.title : "",
    description: initial ? initial.description : "",
    priority: initial ? initial.priority : "medium",
    dueDate: initial && initial.dueDate ? initial.dueDate : "",
    tags: initial ? initial.tags.join(", ") : "",
  })
  const [field, setField] = useState(0)
  useInput((input, key) => {
    if (key.escape) return onCancel()
    if (key.ctrl && input === "s") return onSave(values)
    if (key.tab || key.downArrow) return setField((field + 1) % fields.length)
    if (key.upArrow) return setField((field + fields.length - 1) % fields.length)
    if (key.return) return field === fields.length - 1 ? onSave(values) : setField(field + 1)
    const name = fields[field]
    if (name === "priority" && (key.leftArrow || key.rightArrow)) {
      const direction = key.rightArrow ? 1 : priorities.length - 1
      const next = priorities[(priorities.indexOf(values.priority) + direction) % priorities.length]
      return setValues({ ...values, priority: next })
    }
    if (key.backspace || key.delete) return setValues({ ...values, [name]: values[name].slice(0, -1) })
    if (input && !key.ctrl && !key.meta) {
      if (name === "priority") return
      setValues({ ...values, [name]: values[name] + input })
    }
  })
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1 },
    h(Text, { color: "cyan", bold: true }, initial ? "EDIT TODO" : "ADD TODO"),
    ...fields.map((name, index) => h(Box, { key: name }, h(Text, { color: index === field ? "cyan" : undefined }, (index === field ? "› " : "  ") + labels[name] + ": "), h(Text, { inverse: index === field }, values[name] || (name === "priority" ? "medium" : "")))),
    error ? h(Text, { color: "red" }, "✗ " + error) : null,
    h(Text, { dimColor: true }, "Use YYYY-MM-DD for due date; tags can be comma-separated.")
  )
}

function Help() {
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "cyan", paddingX: 1 },
    h(Text, { color: "cyan", bold: true }, "KEYBOARD SHORTCUTS"),
    h(Text, null, "↑/↓ or j/k  Navigate      Enter  View details"),
    h(Text, null, "a             Add todo      e      Edit selected"),
    h(Text, null, "Space         Complete/reopen selected"),
    h(Text, null, "/             Search        f      Cycle status filter"),
    h(Text, null, "s             Cycle sort    d      Delete selected"),
    h(Text, null, "?             This help     Esc/q  Back or quit")
  )
}

function Search({ query, setQuery, onSubmit }) {
  useInput((input, key) => {
    if (key.escape) return onSubmit("")
    if (key.return || input === "\r") return onSubmit(query)
    if (key.backspace || key.delete) return setQuery(query.slice(0, -1))
    if (input && !key.ctrl && !key.meta) setQuery(query + input)
  })
  return h(Box, { borderStyle: "round", borderColor: "cyan", paddingX: 1 }, h(Text, { color: "cyan" }, "SEARCH  "), h(Text, { inverse: true }, query || " "))
}

function App({ service }) {
  const { exit } = useApp()
  const [todos, setTodos] = useState([])
  const [selected, setSelected] = useState(0)
  const [screen, setScreen] = useState("list")
  const [status, setStatus] = useState("")
  const [sort, setSort] = useState("created")
  const [query, setQuery] = useState("")
  const [flash, setFlash] = useState(null)
  const [formError, setFormError] = useState("")
  const selectedTodo = todos[selected]
  const refresh = useCallback(async (nextStatus = status, nextSort = sort, nextQuery = query) => {
    try {
      const result = await service.list({ status: nextStatus || undefined, sort: nextSort, search: nextQuery || undefined })
      setTodos(result)
      setSelected((current) => Math.min(current, Math.max(0, result.length - 1)))
    } catch (error) { setFlash({ type: "error", message: error.message }) }
  }, [service, status, sort, query])
  useEffect(() => { refresh() }, [refresh])
  const mutate = async (work, message) => {
    try {
      await work()
      await refresh()
      setFlash({ type: "success", message })
      setScreen("list")
    } catch (error) { setFormError(error.message); setFlash({ type: "error", message: error.message }) }
  }
  useInput((input, key) => {
    if (screen === "form-add" || screen === "form-edit" || screen === "search") return
    if (key.ctrl && input === "c") return exit()
    if (screen === "confirm") {
      if (key.escape || input === "n") return setScreen("list")
      if (key.return || input === "y") return mutate(() => service.remove(selectedTodo.id), "Deleted " + selectedTodo.title)
      return
    }
    if (key.escape && screen !== "list") return setScreen("list")
    if (input === "q") return screen === "list" ? exit() : setScreen("list")
    if (screen === "help") return
    if (input === "?") return setScreen("help")
    if (key.downArrow || input === "j") return setSelected(Math.min(selected + 1, Math.max(0, todos.length - 1)))
    if (key.upArrow || input === "k") return setSelected(Math.max(selected - 1, 0))
    if (key.return && selectedTodo) return setScreen("detail")
    if (input === "a") { setFormError(""); setScreen("form-add") }
    if (input === "e" && selectedTodo) { setFormError(""); setScreen("form-edit") }
    if (input === "d" && selectedTodo) return setScreen("confirm")
    if (input === " ") return selectedTodo && mutate(() => service.setCompleted(selectedTodo.id, selectedTodo.status !== "completed"), selectedTodo.status === "completed" ? "Reopened " + selectedTodo.title : "Completed " + selectedTodo.title)
    if (input === "/") return setScreen("search")
    if (input === "f") {
      const next = status === "" ? "active" : status === "active" ? "completed" : ""
      setStatus(next); refresh(next, sort, query); setFlash({ type: "success", message: "Filter: " + (next || "all") })
    }
    if (input === "s") {
      const next = sorts[(sorts.indexOf(sort) + 1) % sorts.length]
      setSort(next); refresh(status, next, query); setFlash({ type: "success", message: "Sorted by " + next })
    }
  })
  const width = process.stdout.columns || 80
  const body = screen === "detail" ? h(Detail, { todo: selectedTodo })
    : screen === "help" ? h(Help)
      : screen === "confirm" ? h(Box, { flexDirection: "column", borderStyle: "round", borderColor: "red", paddingX: 1 }, h(Text, { color: "red", bold: true }, "DELETE TODO?"), h(Text, null, selectedTodo ? selectedTodo.title : ""), h(Text, { dimColor: true }, "Press Enter/y to delete, Esc/n to cancel."))
          : screen === "search" ? h(Search, { query, setQuery, onSubmit: async (term) => { setScreen("list"); setQuery(term); await refresh(status, sort, term); setFlash({ type: "success", message: term ? "Search: " + term : "Search cleared" }) } })
          : screen === "form-add" ? h(Form, { onCancel: () => setScreen("list"), onSave: (values) => mutate(() => service.create({ ...values, tags: values.tags.split(",") }), "Todo created"), error: formError })
            : screen === "form-edit" ? h(Form, { initial: selectedTodo, onCancel: () => setScreen("detail"), onSave: (values) => mutate(() => service.update(selectedTodo.id, { ...values, dueDate: values.dueDate || null, tags: values.tags.split(",") }), "Updated " + selectedTodo.title), error: formError })
              : h(Box, { flexDirection: "column" }, todos.length ? todos.map((todo, index) => h(TodoRow, { key: todo.id, todo, selected: index === selected, width })) : h(Text, { dimColor: true }, "No todos yet. Press a to add your first one."))
  return h(Box, { flexDirection: "column", paddingX: 1 }, h(Header, { todos, status, sort }), body, h(Footer, { screen: screen === "form-add" || screen === "form-edit" ? "form" : screen, flash }))
}

export function startTui(service) {
  return render(h(App, { service }))
}
