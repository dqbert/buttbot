import * as logging from "@lib/logging";
import * as messaging from "@lib/messaging";
import * as constants from "@lib/constants";
import * as discord from "discord.js";
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage } from "@messageCommands/MessageCommandUtilties";
import { CommandsError } from "@messageCommands/MessageCommandProcessor";

class LogCommand implements IMessageCommand
{
    name: string = "log";
    description: string = "Manage Buttbot logging preferences in this server. Logging includes notification of Buttbot updates and more.";
    isDefaultAdmin: boolean = true;
    isEnabled: boolean = false;
    requiresGuild: boolean = true;
    permissions: DiscordPermissionsEnum[] = [];
    usage: IMessageCommandUsage =
    {
        "__main__": "log [channel/unset/disable]",
        "channel": "log channel [channel name]",
        "disable": "log disable [channel name]"
    };
    async process(message: discord.Message): Promise<void>
    {
        throw new CommandsError("This command does not do anything yet.");
        //TODO: rework this using mongodb stuff (not supported yet in schema)
        /*

        var guild = config.guild.fromChannel(message.channel);

        //command only works for guilds
        if (!(config.guild.fromChannel(message.channel) instanceof discord.Guild)) {
            await messaging.send("This command only works in guilds.", message.channel, message.author, message);
            return;
        }

        var guild_cfg = await config.guild.get(guild);

        var argv = message.content.split(' ');
        var subcommand = argv[1];

        if (subcommand == null) {
            await messaging.send(usage, message.channel, message.author, message);
            return;
        }

        subcommand = subcommand.toLowerCase();

        if (subcommand === "help") {
            await messaging.send(usage, message.channel, message.author, message);
            return;
        }

        if (subcommand === "channel") {
            var channel_name = argv.splice(2).join(' ');

            if (channel_name == null || channel_name == "") {
                if (guild_cfg != null) {

                    if (guild_cfg.log_channel == "") {
                        await messaging.send("No channel defined! Use this command to define one.", message.channel, message.author, message);
                        return;
                    }
                    var log_channel = guild.channels.get(guild_cfg.log_channel);

                    if (log_channel instanceof discord.Channel) {
                        await messaging.send(`Current logging channel: ${log_channel.name}`, message.channel, message.author, message);
                        return;
                    }
                }
                await messaging.send(usage, message.channel, message.author, message);
                return;
            }

            var channel = guild.channels.find(channel => new RegExp(channel_name).test(channel.name) && channel.type == "text");
            if (channel == null) {
                await messaging.send(`Could not find a text channel matching ${channel_name}!`, message.channel, message.author, message);
                return;
            }

            //found a channel, fill it in the config
            guild_cfg.log_channel = channel.id;
            config.guild.save(guild_cfg, guild);

            await messaging.send(`Logging channel successfully set to ${channel.name}`, message.channel, message.author, message);
        }
        else if (subcommand === "unset" || subcommand === "disable") {
            if (guild_cfg.log_channel == "") {
                await messaging.send("No channel defined! No need to disable logging.", message.channel, message.author, message);
                return;
            }
            guild_cfg.log_channel = "";
            config.guild.save(guild_cfg, guild);

            await messaging.send(`Logging successfully disabled.`, message.channel, message.author, message);
        }
        else {
            await messaging.send(usage, message.channel, message.author, message);
            return;
        }
        */
    }
}

export const command = new LogCommand();
