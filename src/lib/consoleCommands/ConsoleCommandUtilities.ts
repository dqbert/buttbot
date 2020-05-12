import * as discord from "discord.js";
import * as fs from "fs";
import * as path from "path";

export class CommandsError extends Error
{
    public constructor(message: string)
    {
        super(message);
        Object.setPrototypeOf(this, CommandsError.prototype);
    }
}

export class CommandUsageError extends Error
{
    public constructor(message: string)
    {
        super(message);
        Object.setPrototypeOf(this, CommandUsageError.prototype);
    }
}

export interface IConsoleCommandUsage
{
    __main__: string;
    [usage: string]: string;
}

export interface IConsoleCommand
{
    name: string;
    parent?: string;
    description: string;
    isEnabled: boolean;
    usage: IConsoleCommandUsage;
    process(consoleData: string, message?: discord.Message): Promise<void>;
}

let tempCommands: Array<IConsoleCommand> = [];

let commandDir = fs.opendirSync(path.resolve("lib/consoleCommands/commandFiles"));
let dirEntry = commandDir.readSync();
while (dirEntry)
{
    let commandPath = path.resolve(commandDir.path, dirEntry.name);
    if (/.*\.js$/gi.test(commandPath))
    {
        let command: IConsoleCommand = require(commandPath).command;
        if (command && command.isEnabled)
        {
            tempCommands.push(command);
        }
    }
    dirEntry = commandDir.readSync();
}
commandDir.closeSync();

export var commands: Array<IConsoleCommand> = tempCommands;

export function findCommand(commandName: string): IConsoleCommand | undefined
{
    return commands.filter(command => command.name.toLowerCase() == commandName)[0];
}
