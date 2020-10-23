import * as logging from "@lib/logging"
import { IConsoleCommand, IConsoleCommandUsage } from "@consoleCommands/ConsoleCommandUtilities"

class ExitCommand implements IConsoleCommand
{
    name: string = "exit"
    description: string = "Exits Buttbot gracefully."
    isEnabled: boolean = true
    usage: IConsoleCommandUsage =
    {
        __main__: "exit"
    }
    async process(): Promise<void>
    {
        logging.log("Now exiting...")
        process.exit(0)
    }
}

export const command = new ExitCommand()
