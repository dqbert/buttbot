//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
const config = index.config;
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

var console_commands = require(path.resolve(BOT_PATH, "console_commands"));

var usage = "```Usage: suggest [suggestion]```";

exports.description = "Suggest an idea for buttbot development.";
exports.aliases = ["idea"];

exports.process = async function(message) {

    var argv = message.content.split(" ");

    if (argv[1] == null || argv[1] == "" || argv[1].toLowerCase() == "help") {
        messaging.send(usage, message.channel, message.author, message);
        return;
    }

    await console_commands.process(`todo pending add ${argv.slice(1).join(' ')}`, message);
    messaging.send("Suggestion added successfully!", message.channel, message.author, message);
}
