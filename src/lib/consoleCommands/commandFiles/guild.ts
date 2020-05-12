import * as constants from "@lib/constants";
import * as logging from "@lib/logging";
import * as messaging from "@lib/messaging";
import * as os from 'os';
import * as discord from 'discord.js';
import { IConsoleCommand, IConsoleCommandUsage, CommandUsageError, CommandsError } from "@consoleCommands/ConsoleCommandUtilities";

interface ISubCommand
{
    [subCommand: string]: (splitData: RegExpMatchArray) => Promise<void>;
};

class GuildCommand implements IConsoleCommand
{
    name: string = "guild";
    description: string = "Query information about guilds that Buttbot is active in. Send messages to guilds.";
    isEnabled: boolean = true;
    usage: IConsoleCommandUsage =
    {
        __main__: "guild [list/user/channel/send]",
        list: `guild list "[guild search criteria]"`,
        user: `guild user "[guild search criteria]"."[user search criteria]"`,
        channel: `guild channel "[guild search criteria]"."[channel search criteria]"`,
        send: `guild send "[guild search criteria]"."[channel search criteria]" [message to send]`
    };
    subCommands: ISubCommand =
    {
        list: this.subCommandList.bind(this),
        user: this.subCommandUser.bind(this),
        send: this.subCommandSend.bind(this),
        channel: this.subCommandChannel.bind(this)
    }
    async process(consoleData: string): Promise<void>
    {
        //           1                  2                         3                      4
        //guild [subCommand] "[guild search criteria]"."[other search criteria]" [message to send]
        let splitData = consoleData.match(/guild (\w+)\s*(?:"(.*?)")?(?:."(.*?)")?\s*(.*)$/i);

        if (!splitData)
        {
            throw new CommandUsageError(this.usage.__main__);
        }

        let subCommand = this.subCommands[splitData[1]?.toLowerCase()];

        if (!subCommand)
        {
            throw new CommandUsageError(this.usage.__main__);
        }

        await subCommand(splitData);
    }
    async subCommandList(splitData: RegExpMatchArray)
    {
        //        1              2
        //guild list "[guild search criteria]"
        let searchCriteria = splitData[2]?.trim();
        let response = "";
        let count = 0;

        constants.bot.guilds.cache.forEach(guild =>
        {
            if (new RegExp(searchCriteria, "gi").test(guild.name))
            {
                response += `${os.EOL}${guild.toString()}`;
                count++;
            }
        });

        if (!count)
        {
            logging.log(`No guilds found which match search criteria: ${searchCriteria}`);
        }
        else
        {
            if (searchCriteria)
            {
                logging.log(`All Buttbot guilds (total: ${count}):${response}`);
            }
            else
            {
                logging.log(`Buttbot guilds matching search ${searchCriteria} (total: ${count}):${response}`);
            }
        }
    }
    async subCommandUser(splitData: RegExpMatchArray)
    {
        //       1              2                        3
        //guild user "[guild search criteria]"."[user search criteria]"
        let guildSearchCriteria = splitData[2]?.trim();
        let userSearchCriteria = splitData[3]?.trim();
        if (!guildSearchCriteria && !userSearchCriteria)
        {
            throw new CommandUsageError(this.usage.user);
        }

        let guilds = constants.bot.guilds.cache.filter(guild => new RegExp(guildSearchCriteria, 'gi').test(guild.name) || new RegExp(guildSearchCriteria, 'gi').test(guild.id));

        if (!guilds)
        {
            if (guildSearchCriteria)
            {
                throw new CommandsError(`No guilds were found for search criteria ${guildSearchCriteria}.`);
            }
            else
            {
                throw new CommandsError(`Buttbot is not a member of any guilds.`);
            }
        }

        let response = "";
        guilds.forEach(guild =>
        {
            let members = guild.members.cache.filter(member => new RegExp(userSearchCriteria, 'gi').test(member.user.username) || new RegExp(userSearchCriteria, 'gi').test(member.user.id));
            response += `${os.EOL}In Guild: ${guild.toString()}`;
            if (members.size == 0)
            {
                response += `${os.EOL}- No members found!`;
            }
            else
            {
                response += members.map(member => `${os.EOL}- ${member.user.toString()}`).join("");
            }
        });

        logging.log(`Users in ${guilds.size} guilds${guildSearchCriteria ? ` matching guild criteria "${guildSearchCriteria}"` : ""}${userSearchCriteria ? ` matching user criteria "${userSearchCriteria}"` : ""}${response}`);
    }
    async subCommandSend(splitData: RegExpMatchArray)
    {
        //        1           2                          3                   4
        //guild send "[guild search criteria]"."[channel send criteria]" [message]
        let guildSearchCriteria = splitData[2]?.trim();

        if (!guildSearchCriteria)
        {
            throw new CommandUsageError(this.usage.send);
        }

        let channelSearchCriteria = splitData[3]?.trim();

        if (!channelSearchCriteria)
        {
            throw new CommandUsageError(this.usage.send);
        }

        let message = splitData[4]?.trim();

        if (!message)
        {
            throw new CommandUsageError(this.usage.send);
        }

        let guilds = constants.bot.guilds.cache.filter(guild => new RegExp(guildSearchCriteria, "gi").test(guild.name) || new RegExp(guildSearchCriteria, "gi").test(guild.id));

        if (guilds.size > 1)
        {
            throw new CommandsError(`Search returned ${guilds.size} guilds. Narrow search down to find only 1 guild.
                                     List of found guilds:
                                     ${guilds.map(guild => guild.toString()).join(os.EOL)}`);
        }

        let guild = guilds.first();

        if (!guild)
        {
            throw new CommandsError(`Search returned no guilds. Specify different search criteria to find a guild.`);
        }

        let channels = new discord.Collection<string, discord.TextChannel>();
        guild.channels.cache.forEach(channel =>
        {
            if (channel instanceof discord.TextChannel && (new RegExp(channelSearchCriteria, "gi").test(channel.name) || new RegExp(channelSearchCriteria, "gi").test(channel.id)))
            {
                channels.set(channel.id, channel);
            }
        });

        if (channels.size > 1)
        {
            throw new CommandsError(`Search returned ${channels.size} channels. Narrow search down to find only 1 channel.
                                     List of found channels:
                                     ${channels.map(channel => channel.toString()).join(os.EOL)}`);
        }

        let channel = channels.first();

        if (!channel)
        {
            throw new CommandsError(`Search returned no channels. Specify different search criteria to find a channel.`);
        }

        await messaging.send(message, channel);
        logging.log(`Sent message to "${guild.toString()}"."${channel.toString()}"`);
    }
    async subCommandChannel(splitData: RegExpMatchArray)
    {
        //         1               2                          3
        //guild channel "[guild search criteria]"."[channel search criteria]"
        let guildSearchCriteria = splitData[2]?.trim();
        let channelSearchCriteria = splitData[3]?.trim();

        if (!guildSearchCriteria && !channelSearchCriteria)
        {
            throw new CommandUsageError(this.usage.channel);
        }

        let guilds = constants.bot.guilds.cache.filter(guild => new RegExp(guildSearchCriteria, 'gi').test(guild.name) || new RegExp(guildSearchCriteria, 'gi').test(guild.id));

        if (!guilds)
        {
            if (guildSearchCriteria)
            {
                throw new CommandsError(`No guilds were found for search criteria "${guildSearchCriteria}"`);
            }
            else
            {
                throw new CommandsError(`Buttbot is not a member of any guilds.`);
            }
        }

        let response = "";

        guilds.forEach(guild =>
        {
            let channels = guild.channels.cache.filter(channel => new RegExp(channelSearchCriteria, 'gi').test(channel.name) || new RegExp(channelSearchCriteria, 'gi').test(channel.id));
            response += `${os.EOL}In Guild: ${guild.toString()}`;
            if (channels.size == 0)
            {
                response += `${os.EOL}- No channels found!`;
            }
            else
            {
                response += channels.map(channel => `${os.EOL}- ${channel.toString()}`).join("");
            }
        });
        logging.log(`Channels in ${guilds.size} guilds${guildSearchCriteria ? ` matching guild criteria ${guildSearchCriteria}` : ""}${channelSearchCriteria ? ` matching channel criteria ${channelSearchCriteria}` : ""}${response}`);
    }
}

export const command = new GuildCommand();
