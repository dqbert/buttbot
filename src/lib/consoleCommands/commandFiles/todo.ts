import * as constants from "@lib/constants"
import * as logging from "@lib/logging"
import * as rest from "@lib/rest"
import * as discord from "discord.js"
import { CommandUsageError, IConsoleCommand, IConsoleCommandUsage } from "@consoleCommands/ConsoleCommandUtilities"
import { Todo } from "@entities/Todo"

interface ISubCommand
{
    [subCommand: string]: (splitData: RegExpMatchArray, message?: discord.Message) => Promise<void>
}

class TodoCommand implements IConsoleCommand
{
    name: string = "todo"
    description: string = "Keep track of Buttbot todo list."
    isEnabled: boolean = false
    usage: IConsoleCommandUsage =
    {
        __main__: "todo [add/delete/top/next/pending/approve/deny/move/reorder]",
        add: "todo add [text]",
        delete: "todo delete [index]",
        top: "todo top [count]",
        pending: "todo pending [text]",
        approve: "todo approve [index]",
        deny: "todo deny [index]",
        move: "todo move [original index] [new index]"
    }
    // subCommandsText: ISubCommand =
    // {
    //     add: this.subCommandAdd,
    //     pending: this.subCommandPending,
    // }
    // subCommandsIndex: ISubCommand =
    // {
    //     delete: this.subCommandDelete,
    //     top: this.subCommandTop,
    //     approve: this.subCommandApprove,
    //     deny: this.subCommandDeny,
    //     move: this.subCommandMove
    // }
    async process(consoleData: string, message?: discord.Message | undefined): Promise<void>
    {
        // //           1            2
        // //todo [add or pending] [text]
        // //              1              2        3
        // //todo [not add or pending] [index] [index 2]
        // let splitDataText = consoleData.match(/todo (\w+) (.*)$/gi)
        // let splitDataIndex = consoleData.match(/todo (\w+) (\d+) (\d*)/gi)
        // let subCommand = splitDataText?.[1]?.toLowerCase()
        // if (!subCommand)
        // {
        //     subCommand = splitDataIndex?.[1]?.toLowerCase()
        //     if (!subCommand)
        //     {
        //         throw new CommandUsageError(this.usage.__main__)
        //     }
        // }
        //
        // if (this.subCommandsText.hasOwnProperty(subCommand))
        // {
        //     if (!splitDataText)
        //     {
        //         throw new CommandUsageError(this.usage.__main__)
        //     }
        //     await this.subCommandsText[subCommand](splitDataText, message)
        // }
        // else if (this.subCommandsIndex.hasOwnProperty(subCommand))
        // {
        //     if (!splitDataIndex)
        //     {
        //         throw new CommandUsageError(this.usage.__main__)
        //     }
        //     await this.subCommandsIndex[subCommand](splitDataIndex, message)
        // }
        // else
        // {
        //     throw new CommandUsageError(this.usage.__main__)
        // }
        //
        // if (argv[1] == "pending") {
        //     pending = true
        //     argv[1] = argv[0]
        //     argv.shift()
        // }
        //
        // if (argv[1] == "all" || argv[1] == "" || argv[1] == null)
        // {
        //     var entries = await rest.issues.get()
        //     logging.log(`Open${(pending ? " pending " : " ")}issues:`)
        //     entries.forEach((entry) => {
        //         var labelsJoin = []
        //         var pending_found = false
        //         entry.labels.forEach((label) => {
        //             if (label.name.toLowerCase() === "pending")
        //             {
        //                 pending_found = true
        //             }
        //             labelsJoin.push(label.name)
        //         })
        //         if ((pending && pending_found) ||
        //             (!pending && !pending_found))
        //         {
        //             logging.log(`Issue name: ${entry.title}`)
        //             logging.log(`  Issue URL: ${entry.html_url}`)
        //             logging.log(`  Issue Labels: ${labelsJoin.join(", ")}`)
        //         }
        //     })
        //     //displayTodoEntries(entries)
        // }
        //
        // else if (argv[1] == "delete" || argv[1] == "remove") {
        //
        //     if (argv[2] == null || argv[2] == "") throw new Error("You must specify a valid line to delete!")
        //
        //     //attempt to delete it
        //     var result = await sql.todo.delete(argv[2], pending)
        //
        //     if (result !== null && result !== undefined && result.affectedRows > 0)
        //     {
        //         logging.log("Deleted line successfully!")
        //
        //         //log all entries again
        //         todoRedisplay(pending)
        //
        //         //TODO: if this entry was pending, notify it has been denied??
        //     }
        //     else
        //     {
        //         throw new Error("You must specify a valid line to delete!")
        //     }
        //
        // }
        //
        // else if (argv[1] == "add") {
        //
        //     if (argv[2] == null || argv[2] == "") throw new Error("You must specify a line to add!")
        //     var result
        //
        //     if (message instanceof discord.Message)
        //     {
        //         result = await sql.todo.add(argv.slice(2).join(' '), pending, message.author.id, config.guild.fromChannel(message.channel).id)
        //     }
        //     else
        //     {
        //         result = await sql.todo.add(argv.slice(2).join(' '), pending)
        //     }
        //
        //     if (result !== null && result !== undefined && result.affectedRows > 0)
        //     {
        //         if (pending === true)
        //         {
        //             logging.log("New pending suggestion!")
        //         }
        //         else
        //         {
        //             logging.log("Added todo entry successfully!")
        //         }
        //
        //         //log all entries again
        //         todoRedisplay(pending)
        //     }
        //     else
        //     {
        //         throw new Error("Could not add line!")
        //     }
        //
        // }
        //
        // else if (argv[1] == "top" || argv[1] == "next") {
        //     if (argv[2] == null) {
        //         top = 1
        //     }
        //     else {
        //         top = parseInt(argv[2])
        //     }
        //
        //     if (isNaN(top))
        //     {
        //         throw new Error("Invalid parameter: " + argv[2] + " must be a valid integer!")
        //     }
        //
        //     var entries = await sql.todo.get(null, null, null, top, pending)
        //
        //     displayTodoEntries(entries)
        // }
        //
        // //approve a pending suggestion (make it no longer pending)
        // else if (argv[1] == "approve") {
        //     pending = true
        //     if (argv[2] == null) {
        //         throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!")
        //     }
        //     if (isNaN(parseInt(argv[2]))) {
        //         throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!")
        //     }
        //
        //     //get the index of this pending entry
        //     result = await sql.todo.approve(argv[2])
        //
        //     if (result === null || result === undefined)
        //     {
        //         throw new Error("You must specify a valid index to approve!")
        //     }
        //
        //     logging.log("Suggestion approved!")
        //
        //     //log all entries again
        //     todoRedisplay(pending)
        //
        //     //TODO: if this entry was approved, notify it has been approved
        //
        // }
        // else if (argv[1] == "move" || argv[1] == "reorder" || argv[1] == "swap") {
        //
        //     index1 = parseInt(argv[2])
        //     index2 = parseInt(argv[3])
        //     if (index1 == null || isNaN(index1))
        //     {
        //         throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!")
        //     }
        //     if (index2 == null || isNaN(index2))
        //     {
        //         throw new Error("Invalid parameter: (" + argv[3] + ") must be a valid integer!")
        //     }
        //
        //     var result = await sql.todo.swap(index1, index2, pending)
        //
        //     if (result !== null && result !== undefined && result.affectedRows > 0)
        //     {
        //         logging.log("List reordered successfully!")
        //
        //         //log all entries again
        //         todoRedisplay(pending)
        //     }
        //     else
        //     {
        //         throw new Error(`Could not swap positions of ${index1} and ${index2}`)
        //     }
        //
        // }
        // else {
        //     throw new Error("Invalid subcommand " + argv[1])
        // }
    }
}

export const command = new TodoCommand()

function displayTodoEntries(entries: Array<Todo>)
{
    logging.log("Todo entries:")

    entries.forEach((entry, index) => {
        index = index + 1
        logging.log("[" + index + "] " + entry.text)
    })
    if (entries.length == 0) {
        logging.log("No todo entries found!")
    }
}

function todoRedisplay(pending?: boolean)
{
    if (pending)
    {
        exports.process("todo pending")
    }
    else
    {
        exports.process("todo")
    }
}
