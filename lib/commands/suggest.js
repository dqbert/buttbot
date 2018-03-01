//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');

var console_commands = require(path.resolve(BOT_PATH, "console_commands"));

var usage = "```Usage: suggest [suggestion]```";

exports.description = "Suggest an idea for buttbot development.";
exports.aliases = ["idea"];

exports.process = function(config, message) {
    var argv = message.content.split(" ");
    if (argv[1] == null || argv[1] == "" || argv[1].toLowerCase() == "help") {
        messaging.send(usage, message.channel);
        return;
    }
    console_commands.process("todo pending " + argv.slice(1));
    messaging.send("Suggestion added successfully!", message.channel);
}
