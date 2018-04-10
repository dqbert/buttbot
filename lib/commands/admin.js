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

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

var usage = "```Usage: admin [add/remove/toggle] [command name]```";

exports.description = "Manage admin commands";
exports.requires_admin = true;

exports.process = async function(message) {
    var argv = message.content.split(" ");

    //send usage
    if (argv[1] == null) {
        messaging.send(usage, message.channel, message.author);
        return;
    }
    var admin_commands = await config.admin.get(message.guild);

    //add a command to admin only
    if (argv[1].toLowerCase() == "add" || argv[1].toLowerCase() == "remove" || argv[1].toLowerCase() == "toggle") {
        if (argv[2] == null) {
            messaging.send(usage, message.channel, message.author);
            return;
        }

        var command_name = argv[2];
        if (!admin_commands.hasOwnProperty(command_name)) {
            messaging.send("Error: command " + command_name + " is not valid!", message.channel, message.author);
            return;
        }

        //turn admin only on
        if (argv[1].toLowerCase() == "add" || (argv[1].toLowerCase() == "toggle" && admin_commands[command_name] == false))
            admin_commands[command_name] = true;
        else
            admin_commands[command_name] = false;

        //save changes
        if (!config.admin.save(admin_commands, message.guild)) throw new Error("Couldn't save admin_commands.json!");

        var confirmation = "";
        if (admin_commands[command_name] == true) {
            confirmation = "Command \"" + command_name + "\" now requires admin role membership.";
        }
        else {
            confirmation = "Command \"" + command_name + "\" now does not require admin role membership.";
        }
        messaging.send(confirmation, message.channel, message.author);
    }
    else {
        messaging.send(usage, message.channel, message.author);
        return;
    }
}
