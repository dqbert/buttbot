//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;

//other requires
const discord = require('discord.js');

//send a text message to a channel
exports.send = function(message, channel) {
    var returns;
    try {
        if (message == null || message == "") return;
        if (!(channel instanceof discord.Channel)) {
            throw new Error("You must specify a valid channel to use sendMessage!");
        }

        returns = channel.send(message)
        .catch(err => {
            logging.err(err);
        });
    }
    catch (err) {
        returns = false;
        logging.err(err);
    }
    return returns;
}

exports.send_embed = function(embed, channel) {
    var returns;
    try {
        if (!(channel instanceof discord.Channel)) throw new Error("You must specify a valid channel to use sendMessage!");
        if (!(embed instanceof discord.RichEmbed)) exports.send(embed, channel);

        returns = channel.send("", embed)
        .catch(err => {
            logging.err(err);
        });
    }
    catch (err) {
        returns = false;
        logging.err(err);
    }
    return returns;
}

//delete a message
exports.delete = function(message) {
    try {

        if (!(message instanceof discord.Message)) throw new Error("Invalid message specified to delete!");

        message.delete();

    }
    catch (err) {
        exports.send("Error: Cannot delete message! Make sure I have permissions to delete messages!", message.channel);
        logging.err(err);
    }
}
