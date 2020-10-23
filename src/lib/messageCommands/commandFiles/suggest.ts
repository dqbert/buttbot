import * as messaging from "@lib/messaging"
import * as rest from "@lib/rest"
import * as discord from "discord.js"
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage, CommandUsageError } from "@messageCommands/MessageCommandUtilties"

class SuggestCommand implements IMessageCommand
{
    name: string = "suggest"
    description: string = "Suggest an idea for Buttbot development."
    isDefaultAdmin: boolean = false
    isEnabled: boolean = true
    permissions: DiscordPermissionsEnum[] = []
    usage: IMessageCommandUsage =
    {
        "__main__": "suggest [text of suggestion]"
    }
    async process(message: discord.Message): Promise<void>
    {
        let splitMessage = message.content.match(/suggest\s*(.+)/i)

        if (!splitMessage)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let suggestion = splitMessage[1]

        if (!suggestion)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        await rest.addIssue(message, suggestion)
        await messaging.send("Suggestion added successfully!", message.channel, message.author, message)
    }
}

export const command = new SuggestCommand()
