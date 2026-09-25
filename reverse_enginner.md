# Reverse Engineering the Todo CLI

This guide describes the implementation that is actually in this repository. Read it beside the source, and use the exercises before reading their answers.

## 1. What We Built

This is a Node.js command-line Todo product. It gives each todo an ID and stores an array of todo objects in `data/todos.json`. It supports CRUD, status changes, descriptions, priorities, due dates, tags, filtering, sorting, searching, validation, and readable terminal output.

## 2. Architecture

```
User
  -> index.js
  -> src/cli.js (Commander parser and command handlers)
  -> src/services/todoService.js (business logic)
  -> src/storage/jsonTodoRepository.js (JSON repository)
  -> data/todos.json
```

The CLI knows about terminal commands. The service knows what a valid Todo operation means. The repository knows how bytes become objects and back again. This boundary is why the service tests do not need to run a shell command.

## 3. Project Structure

- `index.js`: executable startup file. It imports `run` from `src/cli.js` and calls it.
- `src/cli.js`: creates the Commander program, registers commands and options, creates the default repository/service, formats results, and translates application errors into messages and exit codes. It imports Commander, Chalk, path utilities, the service, repository, errors, and formatting helpers.
- `src/services/todoService.js`: exports `TodoService`. Its important functions are `create`, `get`, `list`, `searchIn`, `sort`, `update`, `setCompleted`, and `remove`. It imports UUID generation, errors, and validators.
- `src/storage/jsonTodoRepository.js`: exports `JsonTodoRepository`. `initialize`, `readAll`, and `writeAll` isolate `fs/promises`.
- `src/validation.js`: exports validators for title, text, priority, status, dates, tags, and IDs.
- `src/formatting.js`: converts Todo objects to colored one-line or detail output.
- `src/errors.js`: defines `AppError` and `NotFoundError`.
- `test/todoService.test.js`: Node's built-in test file. It creates a temporary repository for every scenario.
- `README.md`: user documentation.
- `data/todos.json`: runtime storage, created on demand and ignored by Git.

## 4. Application Startup

When `npm start list` runs, npm executes `node index.js`. The entry file imports and calls `run()`. `run` creates a program with `createProgram()`. That function resolves the repository path to the project's `data/todos.json`, creates `JsonTodoRepository`, injects it into `TodoService`, then registers Commander commands. Commander parses `process.argv`, invokes the matching async action, and `run` catches application errors.

## 5. CLI Parsing

Node puts the executable and user tokens in `process.argv`. Commander turns the command name, positional arguments, and flags into action parameters. For example, `add "Learn DSA" --priority high` gives the add action a title and an options object containing `priority: "high"`. The action sends that data to the service; it does not write JSON itself. Unknown commands/options and missing required arguments are handled by Commander. Field values are checked again in the service so the service is safe to call from tests or another interface.

## 6. Complete Request Flows

### `todo add "Learn DSA"`

The shell starts `index.js`; Commander dispatches `add`; `src/cli.js` combines the title and flags; `TodoService.create` validates the title, generates an eight-character UUID ID, creates ISO timestamps, defaults status to `active` and priority to `medium`, then calls `repository.readAll`. The repository initializes the directory, reads an existing array or returns an empty array, and `writeAll` serializes the new array to a temporary file before renaming it. The CLI prints the new ID and title.

### `todo list`

Commander invokes the list action. The service reads all records, applies optional status/priority/tag/date filters, then sorts. `formatTodo` renders each item and the CLI prints an empty-state message when no records remain.

### `todo complete <id>`

The complete action calls `setCompleted(id, true)`. The service first uses `get` to find the record, then calls `update` with status `completed`. Update changes the timestamp and persists the entire array.

### `todo update <id>`

The update action collects an optional new title and field flags. Clear flags become empty description, null due date, or empty tags. The service validates only supplied fields, preserves the rest, updates `updatedAt`, and writes the array.

### `todo delete <id>`

The delete action calls `remove`. The service finds the index, removes one item, writes the remaining array, and returns the removed item for the success message.

## 7. Data Model

```json
{
  "id": "a1b2c3d4",
  "title": "Learn DSA",
  "description": "Practice arrays",
  "status": "active",
  "priority": "high",
  "createdAt": "2026-01-01T10:00:00.000Z",
  "updatedAt": "2026-01-01T10:00:00.000Z",
  "dueDate": "2026-02-10",
  "tags": ["study"]
}
```

`id` is a short UUID-derived identifier. `title` is required. `description` defaults to an empty string. `status` is `active` or `completed`. `priority` is `low`, `medium`, or `high`. Timestamps are ISO strings. `dueDate` is either a validated calendar date or null. Tags are normalized lowercase, trimmed, and deduplicated.

## 8. Storage

`JsonTodoRepository.initialize` creates the parent directory. `readAll` reads UTF-8, parses JSON, and requires an array. A missing file behaves as an empty collection. Syntax errors or a non-array root become an `AppError` explaining that storage is malformed. `writeAll` writes formatted JSON to `todos.json.tmp`, then renames it over the target. Every service mutation reads the full array, changes it in memory, and persists the full array. Delete writes the array without the removed record.

## 9. Business Logic

`create(input)` validates and constructs a Todo, then persists it. `get(id)` returns one record or throws `NotFoundError`. `list(filters)` filters and sorts without mutating stored data. `searchIn` checks title, description, and tags case-insensitively. `sort` supports created, updated, priority, due, and alphabetical order. `update(id, changes)` preserves unspecified fields and updates the timestamp. `setCompleted` is the named status transition. `remove` deletes exactly one matching ID.

## 10. Error Handling

Validators and the repository throw `AppError`; missing records throw `NotFoundError`, which uses exit code 2. Command actions reject promises naturally. `run` catches known errors, prints a concise message, and sets `process.exitCode`. Unexpected errors also get a safe error message and exit code 1. Commander handles parser-level errors.

## 11. Testing

Tests use `node:test` and `node:assert/strict`. `mkdtemp` creates a unique temporary directory per setup. A repository pointed at a nested temporary path tests directory initialization without touching real user data. A deterministic clock makes timestamp behavior reproducible. Tests cover creation, persistence, CRUD, state changes, searching, filters, sorting, validation, missing storage, malformed storage, and JSON output.

## 12. JavaScript Concepts Used

- ES modules: `import` and `export` connect files.
- Async functions and promises: filesystem and service operations are awaited.
- Node built-ins: `fs/promises`, `path`, `crypto`, `os`, and `node:test`.
- `process.argv` and `process.exitCode`: CLI input and failure signaling.
- Objects and arrays: Todo records and collection transformations.
- JSON: serialization and deserialization of storage.
- Errors and subclasses: domain-specific failures.
- ISO date strings: stable persistence and lexicographic date sorting.
- Array methods: `map`, `filter`, `find`, `findIndex`, `sort`, and `flatMap`.

## 13. Design Decisions

- JSON: the problem requires local, understandable, database-free persistence; JSON is inspectable and sufficient for a single-user CLI.
- Service layer: business rules should be testable without Commander or terminal output.
- Repository: file details should not leak into the service; a future adapter can implement the same read/write idea.
- Commander: it provides conventional help, flags, aliases, and parser errors with minimal code.
- Chalk: it improves scanning in a terminal without affecting stored data.
- Native test runner: Node already supplies testing, so no extra dependency is needed.
- Atomic replacement: a temporary write followed by rename reduces partial-file risk.

## 14. Edge Cases

- Missing todo or invalid ID: `NotFoundError` and exit code 2.
- Empty title: rejected before persistence.
- Missing JSON: treated as an empty list and the directory is created.
- Corrupted JSON: reported as malformed; it is not silently overwritten.
- Invalid priority/status/date: rejected with allowed values or format.
- Unknown command/option: Commander reports a parser error.
- Duplicate titles/tags: duplicate titles are allowed; duplicate tags within one todo are removed.

## 15. Terminal UI Architecture

There are now two presentation modes that share the same application core. src/cli.js remains the Commander entry point for scriptable commands. When there is no subcommand and stdin/stdout are TTYs, its run function dynamically imports src/tui/app.js and starts Ink. In a pipe or non-interactive environment, it keeps the normal Commander behavior instead of opening a TUI.

Formatting stays out of TodoService. src/formatting.js owns the command-mode headings, responsive list table, detail card, date formatting, overdue detection, and success/error messages. Chalk assigns semantic color: cyan for headings and active work, green for success/completed/low, yellow for medium, and red for errors, high priority, and overdue work. Chalk automatically avoids ANSI color where the terminal does not support it or NO_COLOR is set. The formatter reads process.stdout.columns and uses compact columns and truncated titles on narrow terminals. TodoService only returns Todo data or throws errors; this is why the same mutation can be presented in Commander output, Ink, or a future API.

Ink 5 was selected because its supported Node version is 18+, matching package.json. Ink 6 requires Node 20+. React 18 is used only by Ink for TUI rendering; there is no browser, server, JSX build step, or client-side web application. The TUI uses React.createElement in JavaScript to make this explicit.

The component tree is:

    App
      Header
      TodoRow list, Detail card, Form, Search, Help, or delete-confirmation screen
      Footer

App owns temporary UI state: current screen, selected row, status filter, sort choice, search query, success/error flash message, and form error. None of that is saved to JSON. Persistent todo state is fetched through TodoService. The refresh callback calls service.list after the screen opens, after filter/sort/search changes, and after mutations. Add/edit call service.create and service.update; Space calls service.setCompleted; delete calls service.remove only after the confirmation screen accepts Enter or y.

Keyboard input is handled by Ink useInput. Global shortcuts work on list/detail screens: arrows or j/k move selection, Enter opens details, a/e open forms, Space toggles completion, slash opens search, f cycles all/active/completed, s cycles sort modes, question-mark opens help, d opens confirmation, Esc goes back, and q or Ctrl+C exits. Forms keep shortcut handling local so ordinary typing is not intercepted. Tab/arrows choose form fields, Enter advances/submits, Ctrl+S saves, and priority changes with left/right arrows. Ink handles cursor restoration and terminal cleanup when the app exits.

To redesign the UI, change formatting.js for command output or create/adjust a component in src/tui/app.js. For example, a Projects screen would add a screen name and component, a shortcut that selects it, and calls to a service method. It should not call fs directly or place rendering code into TodoService. Both modes keep sharing TodoService and JsonTodoRepository because the presentation layer only receives service data and requests service operations.

## 16. How To Extend It

Recurring todos need new fields and service rules, plus a recurrence validator. Subtasks, projects, and notes need data-model additions and commands, while the repository can still store the array. Reminders or interactive mode belong mostly in new CLI modules and possibly a scheduler. Import/export and backups belong at the repository or application boundary. SQLite or an API should be introduced as new adapters behind the service, not by adding SQL or HTTP calls to commands.

## 17. Database Migration

Create a repository with the same conceptual `readAll` and `writeAll` responsibilities, or a richer repository interface such as `findById`, `insert`, `update`, and `remove`. Move the data mapping into that adapter, migrate existing JSON once, and inject the new repository in `src/cli.js`. The commands and most service rules remain unchanged. SQLite is a natural local next step; PostgreSQL or MongoDB would require connection configuration and deployment concerns.

## 18. Learning Roadmap

1. Run `npm start --help` and `npm start add "First todo"`.
2. Follow `index.js` into `src/cli.js`.
3. Trace the add action into `TodoService.create`.
4. Read `validation.js` and inspect the generated JSON.
5. Trace `readAll` and `writeAll`.
6. Run tests and change one assertion.
7. Trace complete, update, and delete.
8. Add a small service filter, then expose it through Commander.
9. Write an adapter or import/export feature.

## 19. Reverse Engineering Exercises

1. Find where `todo add` enters the application.
2. Find where IDs are generated.
3. Trace `todo complete` and identify both service calls.
4. Add a `--tag-any` filter without changing repository code.
5. Add a `completedAt` field and decide which service paths update it.
6. Add a `count` command using the service.
7. Replace JSON persistence with an in-memory repository for a test.
8. Design a migration script from JSON to SQLite.

## 20. Interview Questions

Try these before reading the answers:

1. Why does the CLI not call `fs` directly?
2. What does `await` do in `TodoService.create`?
3. Why is `updatedAt` changed during status transitions?
4. How does the repository distinguish missing from malformed storage?
5. Why are temporary writes safer than writing directly?
6. How are tests kept away from real Todo data?
7. What is the difference between `process.exitCode` and immediately exiting?
8. How would concurrent writes affect this design?
9. Why can the service be reused by a REST API?
10. What changes would a PostgreSQL adapter require?

Answers: 1) To separate concerns and keep business logic testable. 2) It pauses the async function until the promise resolves without blocking the event loop. 3) It records the latest mutation. 4) `ENOENT` returns an empty list; parse/root errors become `AppError`. 5) A completed temporary file can replace the target, avoiding a half-written target. 6) Each test gets a `mkdtemp` repository. 7) It lets Node finish pending work and makes the exit status observable. 8) Last writer wins without locking, a documented limitation. 9) The service accepts plain input and returns plain objects. 10) Implement repository operations, configure a connection, and inject the adapter.

## 21. File-by-File Explanation

For `index.js`: input is the process invocation; output is the CLI run; dependency is `src/cli.js\); understand that it is intentionally tiny.

For `src/cli.js`: input is `process.argv\); output is terminal text and exit codes; dependencies are Commander, Chalk, service, repository, errors, formatting; understand command registration and dispatch.

For `src/services/todoService.js`: input is command-shaped data; output is Todo objects or arrays; dependencies are validation, errors, and UUID generation; understand all business rules and persistence calls.

For `src/storage/jsonTodoRepository.js`: input is a file path and Todo arrays; output is arrays or persisted JSON; dependencies are `fs/promises`, `path`, and errors; understand initialization, parsing, and atomic writes.

For `src/validation.js`: input is raw field values; output is normalized values or errors; dependency is `AppError`; understand why validation is centralized.

For `src/formatting.js`: input is Todo objects; output is strings; dependency is Chalk; understand that presentation is separate from storage.

For src/tui/app.js: input is a TodoService instance; output is an Ink-rendered interactive terminal; dependencies are Ink, React hooks, and read-only formatting helpers; understand the distinction between temporary screen state and persistent Todo data, then trace a keyboard shortcut through a service mutation and refresh.

For `src/errors.js`: input is an error message and optional code; output is domain-specific Error objects; understand how errors carry meaning to the CLI.

For `test/todoService.test.js`: input is no real user data; output is pass/fail; dependencies are Node test/fs/os modules and application classes; understand dependency injection and temporary test storage.
