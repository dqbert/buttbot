//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;
const sql = index.sql;
var bot = index.bot;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const discord = require('discord.js');

exports.process = async function(message) {

    var response = "Available commands: ";
    var guild = config.guild.fromChannel(message.channel);
    var commands = await sql.command.get_all_admin(guild.id);

    for (var command of commands) {

        var admin_required = "";

        if (command.requires_admin) {
            admin_required = " [Requires admin]";
        }

        response += `${os.EOL}- ${command.command_name}${admin_required}: `;

        if (command.command_description === null || command.command_description === undefined || command.command_description === "") {
            response += `No valid description specified for ${command.command_name}!`;
        }
        else {
            response += command.command_description;
        }

    }

    response += os.EOL + os.EOL + "For more help, join this channel: https://discordapp.com/invite/5PzVSm8";

    messaging.send(response, message.channel, message.author, message);

    return;
}
