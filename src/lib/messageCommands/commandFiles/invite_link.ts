import * as messaging from "@lib/messaging";
import * as constants from "@lib/constants";
import * as discord from "discord.js";
import { IMessageCommand, IMessageCommandUsage, DiscordPermissionsEnum } from "@messageCommands/MessageCommandUtilties";

class CommandInviteLink implements IMessageCommand
{
    public name :string  = "invite_link";
    public description: string = "Retrieve the Discord invite link for buttbot so that it may be invited to other servers.";
    public isDefaultAdmin: boolean = false;
    public cannotBeAdmin: boolean = true;
    public isEnabled: boolean = true;
    public permissions: DiscordPermissionsEnum[] = [];
    usage: IMessageCommandUsage =
    {
        "__main__": "invite_link"
    }
    async process(message: discord.Message)
    {
        await messaging.send(constants.API_KEY.invite_link, message.channel, message.author, message);
    }
}

export const command = new CommandInviteLink();
