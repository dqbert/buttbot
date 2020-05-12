import * as logging from "@lib/logging";
import * as IConsoleCommand from "@consoleCommands/ConsoleCommandUtilities";
import * as discord from "discord.js"

export async function process(consoleData: string, message?: discord.Message)
{
    if (consoleData)
    {
        // Make the console command show up in the log
        logging.log(consoleData);

        try
        {
            // Get command name as first entry in consoleData
            // a command is always one word then a space then its args
            let splitData = consoleData.match(/^(\w+)\s*(\w*)\s*(\w*)/i);
            if (!splitData)
            {
                throw new IConsoleCommand.CommandsError(`Invalid command syntax: ${consoleData}`);
            }
            let commandName = splitData[1];

            // Command exists, process it
            let command = IConsoleCommand.findCommand(commandName)
            if (command)
            {
                try
                {
                    if (splitData[2]?.toLowerCase() == "help")
                    {
                        throw new IConsoleCommand.CommandUsageError(command.usage.__main__);
                    }
                    await command.process(consoleData, message);
                }
                catch (error)
                {
                    if (error instanceof IConsoleCommand.CommandUsageError)
                    {
                        logging.warn(`Usage: ${error.message}`);
                    }
                    else
                    {
                        throw error;
                    }
                }
            }
            // Command does not exist
            else
            {
                logging.error(`Invalid command: ${commandName}!`);
            }
        }
        catch (error)
        {
            if (error instanceof IConsoleCommand.CommandsError)
            {
                if (error.message)
                {
                    logging.error(error.message);
                }
                else
                {
                    throw error;
                }
            }
            else
            {
                throw error;
            }
        }
    }
}
