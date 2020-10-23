import * as discord from "discord.js"
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage, CommandUsageError } from "@messageCommands/MessageCommandUtilties"
import { CommandsError } from "@messageCommands/MessageCommandProcessor"

class PurgeCommand implements IMessageCommand
{
    name: string = "purge"
    description: string = "Mass delete a number of most recent messages from the current channel."
    isDefaultAdmin: boolean = true
    isEnabled: boolean = true
    permissions: DiscordPermissionsEnum[] = [DiscordPermissionsEnum.MANAGE_MESSAGES]
    usage: IMessageCommandUsage =
    {
        __main__: "purge [message count]"
    }
    async process(message: discord.Message): Promise<void>
    {
        //               1
        //b/purge [message count]
        let splitMessage = message.content.match(/purge (\d+)/i)

        if (!splitMessage)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let deletions = parseInt(splitMessage[1])
        if (isNaN(deletions) || deletions < 1)
        {
            throw new CommandsError(`Invalid message count: ${splitMessage[1]}`)
        }

        deletions++

        try {
            await message.channel.bulkDelete(deletions)
        }
        catch (err)
        {
            if (err.code == "50035")
            {
                throw new CommandsError("You can only purge up to 99 messages.")
            }
            else if (err.code == "50034")
            {
                throw new CommandsError("You cannot purge messages older than 14 days")
            }
            else {
                throw err
            }
        }
    }
}

export const command = new PurgeCommand()
