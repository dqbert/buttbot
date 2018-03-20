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
exports.BOT_PATH = path.resolve('./lib/');
exports.GUILD_PATH = path.resolve('guilds/'),
exports.logging = reload(path.resolve(exports.BOT_PATH, 'logging.js')),
exports.messaging = reload(path.resolve(exports.BOT_PATH, 'messaging.js')),
exports.config = reload(path.resolve(exports.BOT_PATH, 'config.js'))

const GLOB_CONFIG = reload(path.resolve(exports.BOT_PATH, 'config.json'));
const API_KEY = reload(path.resolve(exports.BOT_PATH, 'api_key.json'));
var commands = reload(path.resolve(exports.BOT_PATH, 'commands'));
var con_commands = reload(path.resolve(exports.BOT_PATH, 'console_commands'));

//bot client
var bot = new discord.Client();

//JSON object holding all edited messages and their originals
var edit_swap = {};

var guild_print = async function(guild)
{
    assert.ok(guild instanceof discord.Guild);
    return util.format("[%s]: %s", guild.id, guild.name);
}

exports.logging.log("Buttbot script started" + os.EOL + '-'.repeat(50) + os.EOL);

//login to discord
bot.login(API_KEY.token).then(async function() {
    exports.logging.log("Buttbot running!");
});

//deal with things which can only be done when logged in
bot.on("ready", async function() {
    exports.logging.log("Buttbot ready!");

});

//joined a new guild
bot.on("guildCreate", async function(guild) {
});

//left a guild
bot.on("guildDelete", async function(guild) {
});

//handle incoming messages
bot.on("message", async function(message) {
    var guild_cfg = await exports.config.guild.get(message.guild);
    var init_word;
    var daily_word;
    try {
        //remove extra whitespace
        var content = message.content.trim();

        //don't handle empty string input
        //or messages sent by a bot
        if (content.length < 1 || message.author.bot) return;

        //try to get the word of the day
        daily_word = JSON.parse(await readFile(path.resolve(exports.BOT_PATH, "dailyword.txt")));
        init_word = false;

        //not found, make a new one (trigger catch to set init_word to true)
        if (daily_word == null) throw new Error("No word found, making a new one");

        //time > 24 hours since last word, make a new done
        if (Math.floor(Date.now()/1000) - daily_word.time > 60*60*24) throw new Error("It's time for a new word: " + daily_word.word);

    }
    catch (err) {
        init_word = true;
        exports.logging.log(err.message);
    }

    if (init_word) {
        init_word = true;
        daily_word = {
            word : random_words(),
            time : Math.floor(Date.now()/1000)
        };
        try {
            writeFile(path.resolve(exports.BOT_PATH, "dailyword.txt"), JSON.stringify(daily_word), {flag: 'w'});
        }
        catch (err) {
            exports.logging.err(err);
        }
    }

    //check if message has word of the day for a surprise!!
    if (content.match(new RegExp('\\b' + daily_word.word + '\\b', 'gi'))) {
        exports.messaging.send("AHHHHHHHHHHHHHHHHHHHHHHHH" + os.EOL +
           "AHHHHHHHHHHHHHHHHHHHHHHHH" + os.EOL +
           "<@" + message.author.id + "> said " + daily_word.word +
           ", today's secret word!" + os.EOL +
           "AHHHHHHHHHHHHHHHHHHHHHHHH" + os.EOL +
           "im dumb as hell btw" + os.EOL +
           "https://gph.is/1kxKd90", message.channel);
    }

    //if a message has the prefix, then it's a command (so don't mess with it)
    if (content.match(new RegExp('^' + guild_cfg.prefix, 'g')) ||
        content.match(new RegExp('\<\@' + bot.user.id + '\> ', 'g'))) {
        //reload commands in case of updates
        commands = reload(path.resolve(exports.BOT_PATH, 'commands'));

        //process the command
        commands.process(message, bot);
    }

    //otherwise, check for keywords
    else {
        //get all keywords for this guild
        var data = null;
        try {
            data = await readFile(path.resolve(exports.GUILD_PATH, message.guild.id, 'keywords.json'));
        }
        catch (err) {
            //just doesn't exist, make a new blank one
            if (err.code === "ENOENT") {
                data = "";
                writeFile(path.resolve(exports.GUILD_PATH, message.guild.id, 'keywords.json'), data, {flag: 'w'});
            }
            else {
                //rethrow the error
                setTimeout(async function() {
                    throw err;
                });
            }
        }

        if (data == null || data == "") return;

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

        //split based on records
        data.toString().split(os.EOL).forEach(line => {

            if (line == "" || line == null) return;

            //turn into an object to get the keyword
            line = JSON.parse(line);

            var regex = new RegExp(line.keyword, "gi");
            var old_index = 0;

            //find keyword in the message
            if (message.content.match(regex)) {

                //these subparms require normal message sending
                if ((line.subparm == "keep" || line.subparm == "notify" || line.subparm == "delete") && line.after_text != null && line.after_text != "") {
                    exports.messaging.send(line.after_text, message.channel);
                }

                //this subparm requires a specially formatted embed to send
                if (line.subparm == "edit") {
                    if (edit_message == "") {
                        edit_message = message.content;
                    }
                    edit_message = edit_message.replace(regex, line.after_text);
                }

                //these subparms require deletion of message
                //don't delete a message with a URL in it
                if ((line.subparm == "delete" || line.subparm == "edit") && !message.content.match(new RegExp("http.?:", "gi"))) {
                    delete_message = true;
                }
            }
        });

        if (edit_message != "") {
            embed.setDescription(edit_message);
            var sent_message = await exports.messaging.send_embed(embed, message.channel);

            edit_swap[message_edited.id] = message.content;
            //react so others can add to the reaction
            sent_message.react("🔁");

            //watch this message to allow for reaction toggle
            message_edited.awaitReactions(async function(reaction, user) {
                if (reaction.emoji.name != "🔁" || user.id == bot.user.id) return;
                reaction.remove(user);

                if (message_edited.content == "") {
                    message_edited = await message_edited.edit(edit_swap[message_edited.id]);
                }
                else {
                    message_edited = await message_edited.edit("");
                }

            });
        }
        if (delete_message) {
            exports.messaging.delete(message);
        }
    }
});

//handle warnings
bot.on("warn", async function(warning) {
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
    bot.destroy();
    exports.logging.log("Exiting with RC " + rc);
});
