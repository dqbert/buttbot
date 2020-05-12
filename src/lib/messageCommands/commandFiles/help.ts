import * as messaging from "@lib/messaging";
import * as typegoose from "@typegoose/typegoose";
import * as discord from "discord.js";
import * as os from 'os';
import * as constants from "@lib/constants";
import * as MessageCommandUtilties from "@messageCommands/MessageCommandUtilties";
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage } from "@messageCommands/MessageCommandUtilties";
import { Guild, GuildNotFoundError } from "@entities/Guild";

class HelpCommand implements IMessageCommand
{
    name: string = "help";
    description: string = "Get help with usage of Buttbot.";
    isDefaultAdmin: boolean = false;
    cannotBeAdmin: boolean = true;
    isEnabled: boolean = true;
    permissions: DiscordPermissionsEnum[] = [];
    usage: IMessageCommandUsage =
    {
        "__main__": "help"
    };
    async process(message: discord.Message): Promise<void>
    {
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id});
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id);
        }
        let availableCommands: string[] = [];
        for (let command of Array.from(guild.commands.values()))
        {
            if (command.name && await command.isAllowed(message))
            {
                let messageCommand = MessageCommandUtilties.findCommand(command.name);
                if (messageCommand && messageCommand.isEnabled)
                {
                    availableCommands.push(`- ${command.name} ${command.requiresAdmin ? "[Requires Admin Role]" : ""}: ${messageCommand.description}`);
                }
            }
        }
        await messaging.send(`Available commands:
${availableCommands.length > 0 ? availableCommands.join(os.EOL) : "No commands are available in this Guild."}

For more help, join this channel: ${constants.API_KEY.help_url}`, message.channel, message.author, message);
    }
}

export const command = new HelpCommand();
