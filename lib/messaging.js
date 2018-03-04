//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;

//other requires
const discord = require('discord.js');
const fs = require('fs');
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

//send a text message to a channel
exports.send = async function(message, channel) {
    assert.equal(typeof message, "string");
    assert.ok(channel instanceof discord.Channel);
    return channel.send(message);
}

exports.send_embed = function(embed, channel) {
    assert.equal(channel instanceof discord.Channel);
    if (!(embed instanceof discord.RichEmbed)) return exports.send(embed, channel);

    return channel.send("", embed);
}

//delete a message
exports.delete = function(message) {
    assert.ok(message instanceof discord.Message);
    try {
        message.delete();
    }
    catch (err) {
        exports.send("Error: Cannot delete message! I need the permission MANAGE_MESSAGES to do this.", message.channel);
        setTimeout(async function() {
            throw err;
        });
    }
}
