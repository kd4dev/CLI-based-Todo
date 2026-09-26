# Todo CLI

A production-quality, beginner-readable Todo application for the terminal. It stores todos locally in JSON and keeps the CLI, business logic, and persistence layers separate.

## Features

- **CRUD**: Add, view, update, complete, reopen, and delete todos
- **Rich fields**: Descriptions, priorities (low/medium/high), due dates, tags, timestamps, and stable IDs
- **Filtering**: By status, priority, tag, or due-date range
- **Sorting**: By created/updated date, priority, due date, or title
- **Search**: Across titles, descriptions, and tags
- **Interactive TUI**: Full-screen keyboard-driven terminal UI with Ink
- **Atomic writes**: JSON persistence with temporary-file replacement
- **Validation**: Helpful error messages for invalid input

## Tech stack

JavaScript, Node.js 20+, Commander, Chalk, Ink 5, React 18, and Node's built-in `fs/promises` and test runner. There is no database or backend.

## Installation

```bash
git clone https://github.com/kd4dev/CLI-based-Todo.git
cd CLI-based-Todo
npm install
```

### Make the `todo` command available globally (optional)

```bash
sudo npm link
```

Now you can use `todo` directly instead of `npm start --`.

## Quick Start

```bash
# Add your first todo
node index.js add "Learn DSA" --priority high --due-date 2026-10-01 --tag study

# List all todos
node index.js list

# Open the interactive TUI (just run with no arguments)
npm start
```

> **⚠️ Important**: When using `npm start`, add `--` before flags so npm doesn't swallow them:
> ```bash
> npm start -- add "Learn DSA" --priority high    # ✅ correct
> npm start add "Learn DSA" --priority high        # ❌ npm eats --priority
> ```
> Or use `node index.js` directly — no `--` needed:
> ```bash
> node index.js add "Learn DSA" --priority high    # ✅ always works
> ```

## CLI Usage

### Adding todos

```bash
node index.js add "Learn DSA"
node index.js add "Learn DSA" --description "Practice arrays" --priority high
node index.js add "Learn DSA" --due-date 2026-10-01 --tag study --tag coding
```

### Listing & filtering

```bash
node index.js list
node index.js list --status active
node index.js list --priority high
node index.js list --tag study
node index.js list --due 2026-10-01
node index.js list --due-before 2026-12-31
node index.js list --due-after 2026-01-01
node index.js list --sort priority
node index.js list --status active --priority high --sort due
```

### Viewing, updating, completing, deleting

```bash
node index.js view <id>             # View full details
node index.js update <id> "New Title" --priority low
node index.js update <id> --clear-description --clear-tags
node index.js complete <id>          # Mark done
node index.js uncomplete <id>        # Reopen
node index.js delete <id>            # Remove permanently
```

### Searching

```bash
node index.js search "DSA"           # Searches title, description, and tags
```

### Help

```bash
node index.js --help                 # Show all commands
node index.js add --help             # Help for a specific command
```

## Interactive Terminal UI (TUI)

Run `npm start` with no arguments in an interactive terminal:

```bash
npm start
```

### TUI Keyboard Shortcuts

#### Navigation

| Key | Action |
| --- | --- |
| `↑` / `↓` or `j` / `k` | Navigate up/down through todos |
| `Enter` | View selected todo details |
| `Esc` | Go back to previous screen |
| `q` | Quit (from list screen) |
| `Ctrl+C` | Force quit |

#### Actions

| Key | Action |
| --- | --- |
| `a` | Add a new todo |
| `e` | Edit the selected todo |
| `Space` | Toggle complete/reopen the selected todo |
| `d` | Delete the selected todo (asks for confirmation) |

#### Filtering & Sorting

| Key | Action |
| --- | --- |
| `/` | Open search |
| `f` | Cycle status filter: all → active → completed → all |
| `s` | Cycle sort mode: created → due → priority → alphabetical |

#### Help

| Key | Action |
| --- | --- |
| `?` | Show help screen with all shortcuts |

### Add/Edit Form Shortcuts

| Key | Action |
| --- | --- |
| `Tab` / `↑` / `↓` | Move between fields |
| `Enter` | Next field, or submit on last field |
| **`←` / `→` (Left/Right arrows)** | **Change priority (cycles: low ↔ medium ↔ high)** |
| `Ctrl+S` | Save and close form |
| `Esc` | Cancel and go back |

> **💡 Tip**: When the cursor is on the **Priority** field, use `←` (left arrow) and `→` (right arrow) to cycle through `low`, `medium`, and `high`. You cannot type priority manually — arrows are the only way to change it.

### Delete Confirmation

| Key | Action |
| --- | --- |
| `Enter` or `y` | Confirm deletion |
| `Esc` or `n` | Cancel deletion |

## Command Reference

| Command | Aliases | Purpose |
| --- | --- | --- |
| `add <title>` | — | Create a todo with `--description`, `--priority`, `--due-date`, and repeatable `--tag` |
| `list` | — | List todos with `--status`, `--priority`, `--tag`, `--due`, `--due-before`, `--due-after`, and `--sort` |
| `view <id>` | `show` | Display one todo in detail |
| `update <id> [title]` | — | Change fields; supports `--clear-description`, `--clear-due`, and `--clear-tags` |
| `complete <id>` | `done` | Mark completed |
| `uncomplete <id>` | `undo` | Mark active |
| `delete <id>` | `remove` | Delete permanently |
| `search <term>` | — | Search title, description, and tags |

### Priority Values

| Value | Color | Meaning |
| --- | --- | --- |
| `low` | 🟢 Green | Low urgency |
| `medium` | 🟡 Yellow | Default |
| `high` | 🔴 Red | Urgent |

Dates must be in `YYYY-MM-DD` format.

## Architecture

```
User
  → index.js (entry point with shebang)
  → src/cli.js (Commander parser + TUI launcher)
      ↓ CLI mode                    ↓ TUI mode (no args + TTY)
      Commander commands            src/tui/app.js (Ink + React)
      ↓                            ↓
  → src/services/todoService.js (shared business logic)
  → src/storage/jsonTodoRepository.js (file persistence)
  → data/todos.json
```

The default data file is created relative to the project directory. It is ignored by Git so personal todos are not committed.

## Project Structure

| File | Purpose |
| --- | --- |
| `index.js` | Executable entry point |
| `src/cli.js` | Commands, options, dispatch, and top-level error handling |
| `src/services/todoService.js` | CRUD, filtering, sorting, searching, and state changes |
| `src/storage/jsonTodoRepository.js` | JSON initialization, reads, and atomic writes |
| `src/validation.js` | Shared field validation and normalization |
| `src/formatting.js` | Terminal presentation (colors, tables, detail cards) |
| `src/tui/app.js` | Ink screens, keyboard input, and temporary UI state |
| `src/errors.js` | Application and not-found errors |
| `test/todoService.test.js` | Isolated service and persistence tests |

## Testing

```bash
npm test
```

Tests use temporary directories and never touch the real `data/todos.json`.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `TODO_DATA_FILE` | Custom path for the JSON storage file | `data/todos.json` |
| `NO_COLOR` | Disable colors in terminal output | — |

## Design Decisions

- **JSON**: Transparent, inspectable, database-free local persistence
- **Service layer**: Business rules testable without Commander or terminal output
- **Repository pattern**: File details hidden behind a clean interface; storage is replaceable
- **Commander**: Conventional help, flags, aliases, and parser errors with minimal code
- **Chalk**: Semantic terminal colors that auto-disable when unsupported
- **Ink 5 + React 18**: Interactive TUI without browser, JSX build step, or server; Node 20+ compatible
- **Atomic writes**: Temporary file + rename reduces partial-file corruption risk
- **Native test runner**: Node already supplies testing, no extra dependency needed

## Limitations and Future Improvements

This is a single-user local CLI. It currently lacks:
- Undo/history
- Recurring tasks and reminders
- Subtasks and projects
- Concurrent write locking
- Import/export and backups
- Sync across devices

Future additions could include import/export, backups, subtasks, projects, a SQLite adapter, or a REST API that reuses the service layer.

## License

MIT
