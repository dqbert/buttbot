import * as logging from "@lib/logging"
import * as os from "os"
import { IConsoleCommand, IConsoleCommandUsage, commands } from "@consoleCommands/ConsoleCommandUtilities"

class HelpCommand implements IConsoleCommand
{
    name: string = "help"
    description: string = "List available console commands."
    isEnabled: boolean = true
    usage: IConsoleCommandUsage =
    {
        __main__: "help"
    }
    async process(): Promise<void>
    {
        logging.log(`Available commands: ${commands.map(command => `${os.EOL}- ${command.name}: ${command.description}`).join("")}`)
    }
}

export const command = new HelpCommand()
