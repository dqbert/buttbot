//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
const config = index.config;

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

var usage = "```Usage: prefix [new prefix]```";

exports.description = "Change the prefix for my commands in this channel.";
exports.requires_admin = true;

exports.process = async function(message) {

    var argv = message.content.split(" ");

    if (argv[1] == null || argv[1].toLowerCase() == "help") {
        messaging.send(usage, message.channel);
        return;
    }

    //get new prefix from command
    var prefix = argv[1];

    //update the config
    var guild_cfg = await config.guild.get(message.guild);

    guild_cfg.prefix = prefix;

    await config.guild.save(guild_cfg, message.guild);

    messaging.send("Prefix updated successfully! My new prefix is: " + prefix, message.channel);
}
