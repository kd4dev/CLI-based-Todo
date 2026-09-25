# Todo CLI

A production-quality, beginner-readable Todo application for the terminal. It stores todos locally in JSON and keeps the CLI, business logic, and persistence layers separate.

## Features

- Add, view, update, complete, reopen, and delete todos
- Descriptions, priorities, due dates, tags, timestamps, and stable IDs
- Filter by status, priority, tag, or due-date range
- Sort by created/updated date, priority, due date, or title
- Search titles, descriptions, and tags
- Helpful help, validation, empty states, and non-zero errors
- Atomic JSON writes and clear malformed-storage errors

## Tech stack

JavaScript, Node.js 18+, Commander, Chalk, and Node's built-in `fs/promises` and test runner. There is no database or backend.

## Installation

```bash
git clone https://github.com/kd4dev/CLI-based-Todo.git
cd CLI-based-Todo
npm install
```

Run with `npm start ...`, or expose the command locally with `npm link` and use `todo ...`.

## Usage

```bash
npm start add "Learn DSA" --description "Practice arrays" --priority high --due-date 2026-10-01 --tag study
npm start list
npm start list --status active --priority high --sort due
npm start view <id>
npm start update <id> "Learn graphs" --priority medium
npm start complete <id>
npm start uncomplete <id>
npm start delete <id>
npm start search "DSA"
npm start --help
```

## Interactive terminal UI

Run npm start with no subcommand in an interactive terminal to open the colorful keyboard-driven Todo UI.

    npm start

Use Up/Down or j/k to select a todo, Enter to view it, a to add, e to edit, Space to complete or reopen, slash to search, f to cycle status filters, s to change sorting, d to request deletion, question-mark for help, and q to quit. Delete requires confirmation. The TUI and regular commands use the same TodoService and JSON file.

## Command reference

| Command | Purpose |
| --- | --- |
| `add <title>` | Create a todo; supports `--description`, `--priority`, `--due-date`, and repeatable `--tag` |
| `list` | List todos; supports `--status`, `--priority`, `--tag`, `--due`, `--due-before`, `--due-after`, and `--sort` |
| `view <id>` / `show <id>` | Display one todo |
| `update <id> [title]` | Change fields; supports `--clear-description`, `--clear-due`, and `--clear-tags` |
| `complete <id>` / `done <id>` | Mark completed |
| `uncomplete <id>` / `undo <id>` | Mark active |
| `delete <id>` / `remove <id>` | Delete permanently |
| `search <term>` | Search title, description, and tags |

Priorities are `low`, `medium`, and `high`. Dates must be `YYYY-MM-DD`.

## Architecture

```
CLI (Commander)
  -> command handlers and formatting
  -> TodoService (validation and business rules)
  -> JsonTodoRepository (file persistence)
  -> data/todos.json
```

The default data file is created relative to the project directory. It is ignored by Git so personal todos are not committed.

## Project structure

- `index.js` — executable entry point
- `src/cli.js` — commands, options, dispatch, and top-level error handling
- `src/services/todoService.js` — CRUD, filtering, sorting, searching, and state changes
- `src/storage/jsonTodoRepository.js` — JSON initialization, reads, and atomic writes
- `src/validation.js` — shared field validation and normalization
- `src/formatting.js` — terminal presentation
- `src/tui/app.js` — Ink screens, keyboard input, and temporary UI state
- `src/errors.js` — application and not-found errors
- `test/todoService.test.js` — isolated service and persistence tests
- `reverse_enginner.md` — codebase-specific learning guide

## Testing

```bash
npm test
```

Tests use temporary directories and never touch the real `data/todos.json`.

## Design decisions

JSON keeps the project transparent and meets the local-file requirement. A repository hides file details from the service, making storage replaceable and tests isolated. Commander handles conventional CLI parsing while the service remains usable without a terminal. Ink 5 and React 18 provide the optional Node-18-compatible interactive presentation layer without adding a browser, backend, or JSX build step. Atomic temporary-file replacement reduces the chance of leaving half-written JSON.

## Limitations and future improvements

This is a single-user local CLI: it has no locking for concurrent writers, undo/history, recurring tasks, reminders, or sync. Future additions could include import/export, backups, subtasks, projects, and a SQLite adapter; a REST API could reuse the service layer.
