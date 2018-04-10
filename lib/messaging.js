//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
var bot = index.bot;

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
exports.send = async function(message, channel, user) {
    assert.equal(typeof message, "string", "Cannot send a non string message!");
    assert.ok(channel instanceof discord.Channel, "Channel " + channel + " is not a valid channel!");
    var promise;
    try {
        promise = await channel.send(message);
        //probably a result of a command, log it
        if (user instanceof discord.User) {
            logging.use_log(promise);
        }
    }
    catch (err) {
        if (user instanceof discord.User) {
            var err_msg = await user.send(`I couldn't send message "${message}" to channel ${channel.name} because I don't have permissions to send messages!`);
            //alter the properties for the usage log to make more sense
            err_msg.author = user;
            err_msg.channel = channel;
            err_msg.content = `[sent as error] ${err_msg.content}`;
            logging.use_log(err_msg);
        }
        else {
            logging.log("Couldn't send message!");
            setTimeout(async function() {
                throw err;
            });
        }
    }
    return promise;
}

exports.send_embed = async function(embed, channel, user) {
    assert.ok(channel instanceof discord.Channel, "Channel " + channel + " is not a valid channel!");
    if (!(embed instanceof discord.RichEmbed)) return exports.send(embed, channel);

    var promise;
    try {
        promise = await channel.send("", embed);
    }
    catch (err) {
        if (user instanceof discord.User) {
            user.send(`I couldn't send an embed to channel ${channel.name} because I don't have permissions to send messages!`);
        }
        else {
            logging.log("Couldn't send message!");
            setTimeout(async function() {
                throw err;
            });
        }
    }
    return promise;
}

//delete a message
exports.delete = async function(message, user) {
    assert.ok(message instanceof discord.Message, "Message " + message + " is not a valid message!");
    var promise;
    try {
        promise = await message.delete();
    }
    catch (err) {
        exports.send("Error: Cannot delete message! I need the permission MANAGE_MESSAGES to do this.", message.channel);
        logging.log("Couldn't delete message!");
        setTimeout(async function() {
            throw err;
        });
    }
    return promise;
}
