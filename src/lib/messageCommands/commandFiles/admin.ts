import * as messaging from "@lib/messaging"
import * as discord from "discord.js"
import * as typegoose from "@typegoose/typegoose"
import * as logging from "@lib/logging"
import * as MessageCommandUtilties from "@messageCommands/MessageCommandUtilties"
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage, CommandUsageError } from "@messageCommands/MessageCommandUtilties"
import { Guild, GuildNotFoundError } from "@entities/Guild"
import { CommandsError } from "@messageCommands/MessageCommandProcessor"

class AdminCommand implements IMessageCommand
{
    name: string = "admin"
    description: string = "Configure a buttbot command to require membership of the buttbot admins role."
    isDefaultAdmin: boolean = true
    isEnabled: boolean = true
    requiresGuild: boolean = true
    permissions: DiscordPermissionsEnum[] = []
    usage: IMessageCommandUsage =
    {
        "__main__": "admin [add/remove/toggle] [command name]"
    }
    async process(message: discord.Message): Promise<void>
    {
        //            1           2
        //b/admin subCommand commandName
        let splitMessage = message.content.match(/admin (\w+) (\w+)/i)

        if (!splitMessage)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let subCommand = splitMessage[1]?.toLowerCase()

        if (!subCommand || !["add", "remove", "toggle"].includes(subCommand))
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let commandName = splitMessage[2]?.toLowerCase()

        if (!commandName)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let guild = (await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id}))
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }
        let command = guild.commands.get(commandName)
        let messageCommand = MessageCommandUtilties.findCommand(commandName)

        if (!command || !messageCommand)
        {
            throw new CommandsError(`Invalid command name to ${subCommand}: "${commandName}"`)
        }

        // If adding to admin list, or toggling and it was off, then turn it to require admin
        if (subCommand == "add" || (subCommand == "toggle" && !command.requiresAdmin))
        {
            if (messageCommand.cannotBeAdmin)
            {
                throw new CommandsError(`Command "${commandName}" cannot be made to require admin membership.`)
            }

            if (command.requiresAdmin)
            {
                throw new CommandsError(`Command "${commandName}" already requires admin membership.`)
            }

            command.requiresAdmin = true
        }
        else
        {
            if (!command.requiresAdmin)
            {
                throw new CommandsError(`Command "${commandName}" already does not require admin membership.`)
            }

            command.requiresAdmin = false
        }
        guild.addCommand(command)

        try
        {
            await guild.save()
        }
        catch (err)
        {
            logging.error(`Could not save guild`, guild)
            throw err
        }

        await messaging.send(`Command ${command.name} now ${command.requiresAdmin ? "requires" : "does not require"} buttbot admin role membership.`, message.channel, message.author, message)
    }
}

export const command = new AdminCommand()
