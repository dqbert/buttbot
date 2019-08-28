'use strict';

//installed modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const discord = require('discord.js');
const reload = require('require-reload')(require);
const random_words = require('random-words');
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

//stuff to export to sub-modules
exports.bot = new discord.Client();
exports.BOT_PATH = path.resolve('./lib/');
exports.GUILD_PATH = path.resolve('guilds/');
const API_KEY = reload(path.resolve(exports.BOT_PATH, 'api_key.json'));
exports.API_KEY = API_KEY;
exports.logging = reload(path.resolve(exports.BOT_PATH, 'logging.js'));
exports.messaging = reload(path.resolve(exports.BOT_PATH, 'messaging.js'));
exports.config = reload(path.resolve(exports.BOT_PATH, 'config.js'));
exports.sql = reload(path.resolve(exports.BOT_PATH, 'sql.js'));
exports.rest = reload(path.resolve(exports.BOT_PATH, 'rest.js'));
exports.commands = reload(path.resolve(exports.BOT_PATH, 'commands'));

//redefine the exported modules so they are all inter-defined
exports.logging = reload(path.resolve(exports.BOT_PATH, 'logging.js'));
exports.messaging = reload(path.resolve(exports.BOT_PATH, 'messaging.js'));
exports.config = reload(path.resolve(exports.BOT_PATH, 'config.js'));
//exports.sql = reload(path.resolve(exports.BOT_PATH, 'sql.js'));
exports.rest = reload(path.resolve(exports.BOT_PATH, 'rest.js'));
exports.commands = reload(path.resolve(exports.BOT_PATH, 'commands'));
exports.receivers = new Map();

const GLOB_CONFIG = reload(path.resolve(exports.BOT_PATH, 'config.json'));
var con_commands = reload(path.resolve(exports.BOT_PATH, 'console_commands'));

//JSON object holding all edited messages and their originals
var edit_swap = {};

//load all new guilds that were missed since last startup
var find_guilds = async function(message) {
    var waiting_promises = [];
    var key_array = exports.bot.guilds.keyArray();

    exports.logging.log("Registering any new guilds...");
    for (var key in key_array) {
        var guild = exports.bot.guilds.get(key_array[key]);
        var result = await exports.sql.guild.get(guild.id)
        if (result === null) {
            exports.logging.log(`Found a new guild to register: ${guild.id}`);
            waiting_promises.push(exports.logging.register(message));
        }
    }

    await Promise.all(waiting_promises);
}

exports.logging.log("Buttbot script started" + os.EOL + '-'.repeat(50) + os.EOL);

//login to discord
exports.bot.login(API_KEY.token).then(async function() {
    exports.logging.log("Buttbot running!");
});

//deal with things which can only be done when logged in
exports.bot.on("ready", async function() {
    exports.logging.log("Buttbot ready!");
});

//joined a new guild
exports.bot.on("guildCreate", async function(guild) {
    exports.logging.log(`Joined a guild ${guild.name} [${guild.id}]`);
});

//left a guild
exports.bot.on("guildDelete", async function(guild) {
});

//handle incoming messages
exports.bot.on("message", async function(message) {
    var guild = exports.config.guild.fromChannel(message.channel);
    var content = message.content;

    if (message.author.bot === true || message.author === exports.bot.user) {
        return;
    }

    //check that we have registered this guild
    var guild_check = await exports.sql.guild.get(guild.id);
    if (guild_check === null) {
        await find_guilds(message);
    }

    var guild_check = await exports.sql.guild.compare_commands(guild.id);
    if (guild_check === false) {
        await exports.sql.command.sync(guild.id);
    }

    var guild_prefix = await exports.sql.guild.get_prefix(guild.id);

    //if a message has the prefix, then it's a command (so don't mess with it)
    if (content.match(new RegExp('^' + guild_prefix, 'g')) ||
        content.match(new RegExp('\<\@' + exports.bot.user.id + '\> ', 'g'))) {
        //log command in usage stats
        exports.logging.use_log(message);

        //reload commands in case of updates
        exports.commands = reload(path.resolve(exports.BOT_PATH, 'commands'));

        //process the command
        exports.commands.process(message);
    }

    //otherwise, check for keywords
    else {
        var keywords = await exports.sql.keyword.get.by_message(message);

        if (keywords === null || keywords === undefined || keywords.length === 0) {
            return;
        }

        var color = 'DEFAULT';
        var display_name = '';
        var display_url = '';

        if (message.member != null) {
            if (message.member.displayColor != null) {
                color = message.member.displayColor;
            }

            if (message.member.displayName != null) {
                display_name = message.member.displayName;
            }

            if (message.member.displayAvatarURL != null) {
                display_url = message.member.displayAvatarURL;
            }
        }

        var embed = new discord.RichEmbed()
            .setColor(color)
            .setAuthor(display_name, display_url)
            .setFooter("Click the 🔁 to retrieve your original message");

        var edit_message = "";
        var delete_message = false;
        var send_message = "";

        //split based on records
        keywords.forEach(keyword => {

            var regex = new RegExp(keyword.keyword, "gi");

            //find keyword in the message
            if (message.content.match(regex)) {

                //these keyword_types require normal message sending
                if ((keyword.keyword_type == "keep" || keyword.keyword_type == "notify" || keyword.keyword_type == "delete") && keyword.keyword_text != null && keyword.keyword_text != "") {
                    send_message = send_message + keyword.keyword_text + os.EOL;
                }

                //this keyword_type requires a specially formatted embed to send
                if (keyword.keyword_type == "edit") {
                    if (edit_message == "") {
                        edit_message = message.content;
                    }
                    edit_message = edit_message.replace(regex, keyword.keyword_text);
                }

                //these keyword_types require deletion of message
                //don't delete a message with a URL in it
                if ((keyword.keyword_type == "delete" || keyword.keyword_type == "edit") &&
                     !message.content.match(new RegExp("http.?:", "gi")) &&
                     message.attachments.size === 0) {
                    delete_message = true;
                }
            }
        });

        if (send_message !== "") {
            exports.messaging.send(send_message, message.channel, message.author, message);
        }
        if (edit_message != "") {
            embed.setDescription(edit_message);
            var message_edited = await exports.messaging.send_embed(embed, message.channel);

            edit_swap[message_edited.id] = message.content;
            //react so others can add to the reaction
            try {
                message_edited.react("🔁");

                //watch this message to allow for reaction toggle
                message_edited.awaitReactions(async function(reaction, user) {
                    if (reaction.emoji.name != "🔁" || user.id == exports.bot.user.id) return;
                    reaction.remove(user);

                    if (message_edited.content == "") {
                        message_edited = await message_edited.edit(edit_swap[message_edited.id]);
                    }
                    else {
                        message_edited = await message_edited.edit("");
                    }

                });

            }
            catch (err) {
                logging.log("Couldn't react to an edit message!");
                setTimeout(async function() {
                    throw err;
                });
            }
        }
        if (delete_message) {
            exports.messaging.delete(message);
        }
    }
});

//handle warnings
exports.bot.on("warn", async function(warning) {
    exports.logging.log("Warning received: " + warning);
});

//handle console commands
process.stdin.on("readable", async function() {
    var data = process.stdin.read();
    if (data == null) return;
    if (data instanceof Buffer) data = data.toString();
    await exports.logging.log(data);

    //don't handle invalid input
    if (typeof(data) != "string") return;
    data = data.trim();
    //don't handle empty string input
    if (data.length < 1) return;

    con_commands = reload(path.resolve(exports.BOT_PATH, 'console_commands'));

    //process the command
    con_commands.process(data);
});

process.on("unhandledRejection", async function(err) {
    exports.logging.err(err);
});

process.on("exit", function(rc) {
    exports.bot.destroy();
    exports.logging.log("Exiting with RC " + rc);
});
