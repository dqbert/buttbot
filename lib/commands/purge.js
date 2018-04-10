//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
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

var usage = "```Usage: purge/delete [# of messages to delete]```";

exports.description = "Mass delete a number of most recent messages from the channel this command is invoked from.";
exports.permissions = ["MANAGE_MESSAGES"];
exports.aliases = ["delete"];
exports.requires_admin = true;

exports.process = async function(message) {

    var argv = message.content.split(" ");

    if (argv[1] == null || argv[1].toLowerCase() == "help") {
        messaging.send($1, message.author);
        return;
    }

    if (isNaN(parseInt(argv[1]))) {
        messaging.send("Error: invalid amount of deletions specified: " + argv[1] + "!", message.channel);
        return;
    }

    var deletions = parseInt(argv[1]);

    if (deletions < 1) {
        messaging.send("Error: you must specify at least 1 message to delete! (Specified " + argv[1] + ")", message.channel);
        return;
    }

    deletions++;

    message.channel.bulkDelete(deletions);
}
