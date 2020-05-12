import * as messaging from "@lib/messaging";
import * as typegoose from "@typegoose/typegoose";
import * as discord from "discord.js";
import * as logging from "@lib/logging";
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage } from "@messageCommands/MessageCommandUtilties";
import { Guild, GuildNotFoundError } from "@entities/Guild";

class PrefixCommand implements IMessageCommand
{
    name: string = "prefix";
    description: string = "Change the prefix or list the current prefix for Buttbot commands in this server.";
    isDefaultAdmin: boolean = true;
    isEnabled: boolean = true;
    permissions: DiscordPermissionsEnum[] = [];
    usage: IMessageCommandUsage =
    {
        "__main__": "prefix [new prefix]"
    };
    async process(message: discord.Message): Promise<void>
    {
        //             1
        //b/prefix prefixText
        let splitMessage = message.content.match(/prefix\s*(\S*)/i);
        let prefixText = splitMessage?.[1]?.toLowerCase();
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id});
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id);
        }

        // User didn't specify a new prefix, so just list the current one
        if (!prefixText)
        {
            await messaging.send(`The current Buttbot command prefix is: "${guild.prefix}"`, message.channel, message.author, message);
        }
        // Update the prefix for this guild
        else
        {
            guild.prefix = prefixText;
            try
            {
                await guild.save();
            }
            catch (err)
            {
                logging.error(`Could not update guild for prefix`, guild);
                throw err;
            }
            await messaging.send(`Prefix updated successfully! The new Buttbot command prefix is: "${guild.prefix}"`, message.channel, message.author, message);
        }
    }
}

export const command = new PrefixCommand();
