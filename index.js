'use strict';

//installed modules
const os = require('os');
const fs = require('fs');
const util = require('util');
const path = require('path');
const discord = require('discord.js');
const reload = require('require-reload')(require);

//path constants
const BOT_PATH = path.resolve('./lib/');
//used in sub-module
exports.BOT_PATH = BOT_PATH;

const GUILD_PATH = path.resolve('guilds/');
//used in sub-module
exports.GUILD_PATH = GUILD_PATH;

//requires
const config = reload(path.resolve(BOT_PATH, 'config.json'));
//used in sub-module
exports.config = config;

const logging = reload(path.resolve(BOT_PATH, 'logging.js'));
//used in sub-module
exports.logging = logging;

const messaging = reload(path.resolve(BOT_PATH, 'messaging.js'));
//used in sub-module
exports.messaging = messaging;

const guild_init = reload(path.resolve(BOT_PATH, 'guild_init.js'));
var commands = reload(path.resolve(BOT_PATH, 'commands'));
var con_commands = reload(path.resolve(BOT_PATH, 'console_commands'));

//bot client
var bot = new discord.Client();

//JSON object holding all current configs
var configs = {};

//JSON object holding all edited messages and their originals
var edit_swap = {};

var guild_print = function(guild)
{
    return util.format("[%s]: %s", guild.id, guild.name);
}

var guild_cfg_update = function(guild) {
    var returns = true;
    var updated = false;

    //check if guild config exists before saving it
    if (!configs.hasOwnProperty(guild.id)) {
        logging.log("Can't update config for guild:");
        logging.log(guild_print(guild));
        logging.log("Guild config doesn't exist in array!");
        return false;
    }

    //save old cfg in case of error
    var guild_cfg = configs[guild.id];

    //exists, so update it
    for (var key in guild_init.guild_default) {
        //create key if not found
        if (!configs[guild.id].hasOwnProperty(key)) {
            updated = true;
            configs[guild.id][key] = guild_init.guild_default[key];
        }
    }

    //resave the file if the config was updated
    if (updated) {
        try {
            logging.log("Updating local config for guild: ");
            logging.log(guild_print(guild));
            fs.writeFileSync(path.resolve(GUILD_PATH, guild.id, "config.json"), JSON.stringify(configs[guild.id]), {flag: 'w'});
        }
        catch (err) {
            logging.log("Error updating guild config for: ");
            logging.log(guild_print(guild));
            logging.err(err);
            //restore old cfg because of error
            configs[guild.id] = guild_cfg;
            returns = false;
        }
    }

    return returns;
}

//read config from guild and create new if non existant
var guild_read_cfg = function(guild)
{
    logging.log("Handling config for guild: ");
    logging.log(guild_print(guild));
    var guild_dir = path.resolve(GUILD_PATH, guild.id);
    var guild_cfg = path.resolve(guild_dir, 'config.json');
    try {
        var guild_read = fs.readFileSync(guild_cfg);
        configs[guild.id] = JSON.parse(guild_read);

        if (!guild_cfg_update(guild)) process.exit(1);
    }
    catch (err) {
        var cfg_obj = guild_init.start_guild();
        try {
            logging.log("Couldn't find guild config! Creating new file %s", guild_cfg);
            fs.writeFileSync(guild_cfg, JSON.stringify(cfg_obj), {flag: 'w'});
        }
        catch (err2) {
            logging.log("Couldn't create new file! Creating new directory %s", guild_path);
            try {
                fs.mkdirSync(guild_path);
            }
            catch (err3) {
                logging.log("Couldn't create new directory!");
                logging.err(err3);
                process.exit(1);
            }
            finally {
                logging.log("Directory creation successful! Creating new file %s", guild_cfg);
                fs.writeFileSync(guild_cfg, JSON.stringify(cfg_obj), {flag: 'w'});
            }
        }
        configs[guild.id] = cfg_obj;
    }
}

var guild_del_cfg = function(guild)
{
    logging.log("Deleting guild from configs: ");
    logging.log(guild_print(guild));
    delete configs[guild.id];
}

logging.log("Buttbot script started" + os.EOL + '-'.repeat(50) + os.EOL);

//login to discord
bot.login(config.token).then(() => {
    logging.log("Buttbot running!");
});

//deal with things which can only be done when logged in
bot.on("ready", () => {
    logging.log("Buttbot ready!");

    //read each config for each guild
    logging.log("Reading guild configs");
    bot.guilds.forEach(guild_read_cfg);
});

//joined a new guild, read its config
bot.on("guildCreate", guild => {
    logging.log("Joined new guild: ");
    logging.log(guild_print(guild));
    guild_read_cfg(guild);
});

//left a guild, delete its config to save resources
bot.on("guildDelete", guild => {
    logging.log("Left a guild: ");
    logging.log(guild_print(guild));
    guild_del_cfg(guild);
});

//handle incoming messages
bot.on("message", message => {
    //remove extra whitespace
    var content = message.content.trim();

    //don't handle empty string input
    //or messages sent by myself
    if (content.length < 1 || message.author.id == bot.user.id) return;

    //set up config for this guild if it doesn't exist
    if (!configs.hasOwnProperty(message.guild.id)) guild_read_cfg(message.guild);

    //if a message has the prefix, then it's a command (so don't mess with it)
    if (content.match(new RegExp('^' + configs[message.guild.id].prefix, 'g'))) {
        //reload commands in case of updates
        commands = reload(path.resolve(BOT_PATH, 'commands'));

        //process the command
        commands.process(configs[message.guild.id], message, bot);
    }
    //otherwise, check for keywords
    else {
        try {
            //get all keywords for this guild
            fs.readFile(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'), (err, data) => {

                if (data == null) return;
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

                if (message.member)
                var embed = new discord.RichEmbed()
                    .setColor(color)
                    .setAuthor(display_name, display_url);

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
                        if ((line.subparm == "keep" || line.subparm == "delete") && line.after_text != null && line.after_text != "") {
                            messaging.send(line.after_text, message.channel);
                        }

                        //this subparm requires a specially formatted embed to send
                        if (line.subparm == "edit") {
                            if (edit_message == "") {
                                edit_message = message.content;
                            }
                            edit_message = edit_message.replace(regex, line.after_text);
                        }

                        //these subparms require deletion of message
                        if (line.subparm == "delete" || line.subparm == "edit") {
                            delete_message = true;
                        }
                    }
                });

                if (edit_message != "") {
                    embed.setDescription(edit_message);
                    var message_promise = messaging.send_embed(embed, message.channel);
                    var original_content = message.content;
                    if (message_promise != false) {
                        message_promise.then(message_edited => {
                            edit_swap[message_edited.id] = original_content;
                            message_edited.react("🔁")
                            .catch(err => {
                                logging.err(err);
                            });
                            message_edited.awaitReactions((reaction, user) => {
                                if (reaction.emoji.name != "🔁" || user.id == bot.user.id) return;
                                reaction.remove(user);
                                if (message_edited.content == "") {
                                    message_edited.edit(edit_swap[message_edited.id])
                                    .then(message => message_edited = message);
                                }
                                else {
                                    message_edited.edit("")
                                    .then(message => message_edited = message);
                                }
                            })
                            .catch(err => {
                                logging.err(err);
                            });
                        })
                        .catch(err => {
                            logging.err(err);
                        });
                    }
                }
                if (delete_message) {
                    messaging.delete(message);
                }
            });
        }
        catch (err) {
            logging.err(err);
        }
    }
});

//handle warnings
bot.on("warn", warning => {
    logging.log("Warning received: " + warning);
});

//handle console commands
process.stdin.on("readable", function() {
    var data = process.stdin.read();
    if (data instanceof Buffer) data = data.toString();
    logging.log(data);
    //don't handle invalid input
    if (typeof(data) != "string") return;
    data = data.trim();
    //don't handle empty string input
    if (data.length < 1) return;

    con_commands = reload(path.resolve(BOT_PATH, 'console_commands'));

    //process the command
    con_commands.process(data);
});

process.on("unhandledRejection", (err) => {
    logging.err(err);
});
