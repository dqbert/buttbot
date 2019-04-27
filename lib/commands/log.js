//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;
var bot = index.bot;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const discord = require('discord.js');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

//voice receivers for persistance
var receivers = index.receivers;

var usage = "```Usage: log [channel/unset/disable/help]"+os.EOL+
"channel - display current channel or set the channel for logging"+os.EOL+
"unset/disable - unset channel for logging"+os.EOL+
"help - display this help```";

exports.description = "Manage buttbot logging for this guild.";
exports.requires_admin = false;

exports.process = async function(message) {

    messaging.send("This command does not do anything yet.", message.channel, message.author, message);
    return;

    //TODO: rework this using SQL stuff (not supported yet in schema)
    /*

    var guild = config.guild.fromChannel(message.channel);

    //command only works for guilds
    if (!(config.guild.fromChannel(message.channel) instanceof discord.Guild)) {
        messaging.send("This command only works in guilds.", message.channel, message.author, message);
        return;
    }

    var guild_cfg = await config.guild.get(guild);

    var argv = message.content.split(' ');
    var subcommand = argv[1];

    if (subcommand == null) {
        messaging.send(usage, message.channel, message.author, message);
        return;
    }

    subcommand = subcommand.toLowerCase();

    if (subcommand === "help") {
        messaging.send(usage, message.channel, message.author, message);
        return;
    }

    if (subcommand === "channel") {
        var channel_name = argv.splice(2).join(' ');

        if (channel_name == null || channel_name == "") {
            if (guild_cfg != null) {

                if (guild_cfg.log_channel == "") {
                    messaging.send("No channel defined! Use this command to define one.", message.channel, message.author, message);
                    return;
                }
                var log_channel = guild.channels.get(guild_cfg.log_channel);

                if (log_channel instanceof discord.Channel) {
                    messaging.send(`Current logging channel: ${log_channel.name}`, message.channel, message.author, message);
                    return;
                }
            }
            messaging.send(usage, message.channel, message.author, message);
            return;
        }

        var channel = guild.channels.find(channel => new RegExp(channel_name).test(channel.name) && channel.type == "text");
        if (channel == null) {
            messaging.send(`Could not find a text channel matching ${channel_name}!`, message.channel, message.author, message);
            return;
        }

        //found a channel, fill it in the config
        guild_cfg.log_channel = channel.id;
        config.guild.save(guild_cfg, guild);

        messaging.send(`Logging channel successfully set to ${channel.name}`, message.channel, message.author, message);
    }
    else if (subcommand === "unset" || subcommand === "disable") {
        if (guild_cfg.log_channel == "") {
            messaging.send("No channel defined! No need to disable logging.", message.channel, message.author, message);
            return;
        }
        guild_cfg.log_channel = "";
        config.guild.save(guild_cfg, guild);

        messaging.send(`Logging successfully disabled.`, message.channel, message.author, message);
    }
    else {
        messaging.send(usage, message.channel, message.author, message);
        return;
    }
    */

}
