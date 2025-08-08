
import chalk from "chalk"
import { Command } from "commander"
import fs from "fs"

const program = new Command()

program
  .name("counter")
  .description("CLI to do file based tasks")
  .version("0.8.0")

program
  .command("add")
  .description("Add a task into to-do list")
  .argument("<todo>", "Task to add")
  .argument("<file>", "File where action is performed")
  .action((todo, file) => {
    fs.appendFile(file, todo + "\n", "utf-8", (err) => {
      if (err) return console.log(chalk.red(err))
      console.log(chalk.green("Added successfully"))
    })
  })

program
  .command("delete")
  .description("Delete a task from to-do list")
  .argument("<todo>", "Task to delete")
  .argument("<file>", "File where action is performed")
  .action((todo, file) => {
    fs.readFile(file, "utf-8", (err, data) => {
      if (err) {
        console.log(chalk.red("File does not exist or cannot be read"))
        return
      }
      const newData = data
        .split("\n")
        .filter((line) => line.trim() !== todo.trim())
        .join("\n")

      fs.writeFile(file, newData, "utf-8", (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(chalk.yellow(` Deleted: ${todo}`))
      })
    })
  })

program
  .command("done")
  .description("Mark a task as done")
  .argument("<todo>", "Task to mark as done")
  .argument("<file>", "File where action is performed")
  .action((todo, file) => {
    fs.readFile(file, "utf-8", (err, data) => {
      if (err) {
        console.log(chalk.red(" File does not exist or cannot be read"))
        return
      }

      let updated = false
      const updatedData = data
        .split("\n")
        .map((line) => {
          if (line.trim() === todo.trim()) {
            updated = true
            return ` ${line}`
          }
          return line
        })
        .join("\n")

      fs.writeFile(file, updatedData, "utf-8", (err) => {
        if (err) return console.log(chalk.red(err))
        if (updated) {
          console.log(chalk.blue(`Marked as done: ${todo}`))
        } else {
          console.log(chalk.red("Task not found"))
        }
      })
    })
  })

program.parse()









