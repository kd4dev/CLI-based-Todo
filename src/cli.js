import chalk from "chalk"
import { Command } from "commander"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { AppError } from "./errors.js"
import { errorMessage, formatDetails, formatTodoList, success } from "./formatting.js"
import { JsonTodoRepository } from "./storage/jsonTodoRepository.js"
import { TodoService } from "./services/todoService.js"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function serviceFor(storagePath = process.env.TODO_DATA_FILE || path.join(projectRoot, "data", "todos.json")) {
  return new TodoService(new JsonTodoRepository(storagePath))
}

function addCommonOptions(command, withDefaultPriority = true) {
  const priorityOption = withDefaultPriority ? ["medium"] : []
  return command.option("-d, --description <text>", "Optional description").option("-p, --priority <priority>", "low, medium, or high", ...priorityOption).option("-D, --due-date <date>", "Due date (YYYY-MM-DD)").option("-t, --tag <tag>", "Tag (repeatable)", (value, previous) => [...(previous || []), value])
}

export function createProgram(service = serviceFor()) {
  const program = new Command()
  program.name("todo").description("A simple, focused Todo CLI backed by a local JSON file.").version("1.0.0").showSuggestionAfterError()

  addCommonOptions(program.command("add <title>").description("Create a todo")).action(async (title, options) => {
    const todo = await service.create({ title, ...options, tags: options.tag })
    console.log(success("Todo created", "ID       " + todo.id + "\n  Title    " + todo.title + "\n  Priority " + todo.priority.toUpperCase() + "\n  Status   Active"))
  })

  const list = program.command("list").description("List todos").option("-s, --status <status>", "active or completed").option("-p, --priority <priority>", "low, medium, or high").option("-t, --tag <tag>", "Filter by tag").option("--due <date>", "Due on date").option("--due-before <date>", "Due on or before date").option("--due-after <date>", "Due on or after date").option("--sort <field>", "created, updated, priority, due, or alphabetical", "created")
  list.action(async (options) => {
    const todos = await service.list(options)
    console.log(formatTodoList(todos, options))
  })

  const view = program.command("view <id>").alias("show").description("View one todo")
  view.action(async (id) => console.log(formatDetails(await service.get(id))))

  addCommonOptions(program.command("update <id> [title]").description("Update a todo").option("--clear-description", "Remove the description").option("--clear-due", "Remove the due date").option("--clear-tags", "Remove all tags"), false).action(async (id, title, options) => {
    const { tag, ...changes } = options
    if (title !== undefined) changes.title = title
    if (tag !== undefined) changes.tags = tag
    if (options.clearDescription) changes.description = ""
    if (options.clearDue) changes.dueDate = null
    if (options.clearTags) changes.tags = []
    const todo = await service.update(id, changes)
    console.log(success("Todo updated", todo.title))
  })

  program.command("complete <id>").alias("done").description("Mark a todo complete").action(async (id) => console.log(success("Completed", (await service.setCompleted(id, true)).title)))
  program.command("uncomplete <id>").alias("undo").description("Mark a todo active").action(async (id) => console.log(success("Reopened", (await service.setCompleted(id, false)).title)))
  program.command("delete <id>").alias("remove").description("Delete a todo").action(async (id) => console.log(success("Deleted", (await service.remove(id)).title)))

  program.command("search <term>").description("Search titles, descriptions, and tags").option("--sort <field>", "created, updated, priority, due, or alphabetical", "created").action(async (term, options) => {
    const todos = await service.list({ search: term, sort: options.sort })
    const output = formatTodoList(todos, { ...options, search: term }, "SEARCH: \"" + term + "\"")
    console.log(output)
    if (!todos.length) console.log(chalk.dim("\nNo todos found for \"" + term + "\"."))
  })
  return program
}

export async function run(argv = process.argv) {
  const service = serviceFor()
  if (argv.slice(2).length === 0 && process.stdout.isTTY && process.stdin.isTTY) {
    const { startTui } = await import("./tui/app.js")
    startTui(service)
    return
  }
  const program = createProgram(service)
  try {
    await program.parseAsync(argv)
  } catch (error) {
    if (error instanceof AppError) {
      console.error(errorMessage(error.message))
      process.exitCode = error.code
      return
    }
    console.error(errorMessage(error.message))
    process.exitCode = 1
  }
}
