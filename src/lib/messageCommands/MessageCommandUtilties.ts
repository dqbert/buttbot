import * as discord from "discord.js"
import * as fs from "fs"
import * as path from "path"

export class CommandDocumentNotFoundError extends Error
{
    constructor(message: string)
    {
        super(message)
        Object.setPrototypeOf(this, CommandDocumentNotFoundError.prototype)
    }
}

export class CommandUsageError extends Error
{
    constructor(message: string)
    {
        super(message)
        Object.setPrototypeOf(this, CommandUsageError.prototype)
    }
}

export enum DiscordPermissionsEnum
{
    ADMINISTRATOR = "ADMINISTRATOR",
    CREATE_INSTANT_INVITE = "CREATE_INSTANT_INVITE",
    KICK_MEMBERS = "KICK_MEMBERS",
    MANAGE_CHANNELS = "MANAGE_CHANNELS",
    MANAGE_GUILD = "MANAGE_GUILD",
    ADD_REACTIONS = "ADD_REACTIONS",
    VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG",
    STREAM = "STREAM",
    SEND_MESSAGES = "SEND_MESSAGES",
    MANAGE_MESSAGES = "MANAGE_MESSAGES",
    EMBED_LINKS = "EMBED_LINKS",
    ATTACH_FILES = "ATTACH_FILES",
    MENTION_EVERYONE = "MENTION_EVERYONE",
    CONNECT = "CONNECT",
    SPEAK = "SPEAK",
    MUTE_MEMBERS = "MUTE_MEMBERS",
    DEAFEN_MEMBERS = "DEAFEN_MEMBERS",
    MOVE_MEMBERS = "MOVE_MEMBERS",
    USE_VAD = "USE_VAD",
    CHANGE_NICKNAME = "CHANGE_NICKNAME",
    MANAGE_ROLES = "MANAGE_ROLES",
    MANAGE_EMOJIS = "MANAGE_EMOJIS"
}

export interface IMessageCommandUsage
{
    __main__: string
    [others: string]: string
}

export interface IMessageCommand
{
    name: string
    parent?: string
    description: string
    isDefaultAdmin: boolean
    cannotBeAdmin?: boolean
    isEnabled: boolean
    requiresGuild?: boolean
    permissions: Array<DiscordPermissionsEnum>
    usage: IMessageCommandUsage
    process(message: discord.Message): Promise<void>
}

let tempCommands: Array<IMessageCommand> = []

let commandDir = fs.opendirSync(path.resolve("lib/messageCommands/commandFiles"))
let dirEntry = commandDir.readSync()
while (dirEntry)
{
    let commandPath = path.resolve(commandDir.path, dirEntry.name)
    if (/.*\.js$/gi.test(commandPath))
    {
        let command: IMessageCommand = require(commandPath).command
        if (command)
        {
            tempCommands.push(command)
        }
    }
    dirEntry = commandDir.readSync()
}
commandDir.closeSync()

export var commands: Array<IMessageCommand> = tempCommands

export function findCommand(commandName: string): IMessageCommand | undefined
{
    return commands.filter(command => command.name.toLowerCase() == commandName.toLowerCase())[0]
}
