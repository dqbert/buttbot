//constants from index.js
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;
var bot = index.bot;

//requires
const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('assert');
const discord = require('discord.js');

//other constants
const todo_file = path.resolve(BOT_PATH, 'todo.txt');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

exports.description = "Guild [list, users, config, admin, keywords, send, channel]";

var usage = exports.description;
var user_usage = "Guild users guild: [guild name or guild id] user: [username or user id]";
var send_usage = "Guild send [guild identifier] [channel id] [message to send]"
var channel_usage = "Guild channel [guild identifier] [channel identifier]"

exports.process = async function(data) {
    //split up command name into argv
    var argv = data.split(" ");

    if (argv[1] == null || argv[1] == "") {
        logging.log(usage);
        return;
    }

    var subcommand = argv[1].toLowerCase();

    //get a list of guilds we are connected to
    if (subcommand == "list") {
        var parameters = argv.slice(2).join(' ');
        var found = 0;

        if (parameters == null || parameters == "") {
            logging.log("Printing all connected guilds:");
        }
        else {
            logging.log("Printing guilds that match search: " + parameters);
        }

        bot.guilds.forEach((guild) => {
            if (parameters == null || guild.name.match(new RegExp(parameters, 'gi')) != null || guild.id.toString().match(new RegExp(parameters, 'g')) != null) {
                logging.log(logging.guild_print(guild));
                found++;
            }
        });

        if (!found) {
            logging.log("No guilds found for search: " + parameters + "!");
        }
        else {
            logging.log(found + " guilds found!");
        }
    }
    else if (subcommand == "users") {
        var parameters = argv.slice(2).join(' ');

        //search for our parms
        var regex_results = new RegExp("guild:\s*(.*)\s*user:\s*(.*)\s*", "gi").exec(parameters);
        if (regex_results == null) {
            logging.log(user_usage);
            return;
        }
        var guild_parm = regex_results[1];
        var user_parm = regex_results[2];

        //we need to specify both
        if (guild_parm == null || user_parm == null) {
            logging.log(user_usage);
            return;
        }

        guild_parm = guild_parm.trim();
        user_parm = user_parm.trim();

        var found = 0;
        var g_found = 0;

        if (parameters == null || parameters == "") {
            throw new Error("Cannot list all users! You must specify a user id or username to search for!");
        }
        else {
            logging.log("Printing users that match search: " + parameters);
        }

        bot.guilds.forEach((guild) => {
            if (guild.name.match(new RegExp(guild_parm, 'gi')) != null || guild.id.toString().match(new RegExp(guild_parm, 'g')) != null) {
                g_found++;
                logging.log("In guild: " + logging.guild_print(guild));

                guild.members.forEach((member) => {
                    assert.notEqual(member.user, null);
                    assert.notEqual(member.user.username, null);
                    assert.notEqual(member.user.id, null);
                    if (member.user.username.match(new RegExp(user_parm, 'gi')) != null|| member.user.id.toString().match(new RegExp(user_parm, 'gi')) != null) {
                        logging.log(logging.user_print(member.user));
                        found++;
                    }
                });

                if (!found) {
                    logging.log("No users found for search: " + user_parm + "!");
                }
                else {
                    logging.log(found + " users found!");
                    found = 0;
                }
            }
        });

        if (!g_found) {
            logging.log("No users guilds for search: " + guild_parm + "!");
        }
        else {
            logging.log(g_found + " guilds found!");
        }
    }
    else if (subcommand === "info") {
        var parameters = argv.slice(2).join(' ');
        bot.guilds.forEach(async (guild) => {
            if (parameters == null ||
                guild.name.match(new RegExp(parameters, 'gi')) != null ||
                guild.id.toString().match(new RegExp(parameters, 'g')) != null) {

                var response = "";

                //get directory
                var dirEnt = await readdir(path.resolve(GUILD_PATH, guild.id));
                dirEnt = dirEnt.toString();

                //check for admin_commands.json
                response += "Admin commands exists: " + new RegExp('admin_commands\.json', 'gi').test(dirEnt) + " | ";
                //check for config.json
                response += "Config exists: " + new RegExp('config\.json', 'gi').test(dirEnt) + " | ";
                //check for keywords
                if (new RegExp('keywords\.json', 'gi').test(dirEnt)) {
                    var keyword_count = await readFile(path.resolve(GUILD_PATH, guild.id, 'keywords.json'));
                    keyword_count = keyword_count.toString().split(os.EOL).length - 1;
                    response += "Number of keywords: " + keyword_count;
                }
                else {
                    response += "Number of keywords: 0";
                }
                var guild_cfg = await config.guild.get(guild);
                response += ` | Usage: ${guild_cfg.usage}`;
                response += os.EOL;
                response += os.EOL;
                logging.log("Getting info for: " + logging.guild_print(guild) + os.EOL + response);
            }
        });
    }
    else if (subcommand === "send") {
        var parameters = argv.slice(2);

        //get guild id or identifier
        if (parameters[0] == null || parameters[0] == "") {
            logging.log(send_usage);
            return;
        }
        var guild_ident = parameters[0];

        //get channel id in guild
        if (parameters[1] == null || parameters[1] == "") {
            logging.log(send_usage);
            return;
        }
        var channel_id = parameters[1];

        //get message to send
        if (parameters[2] == null || parameters[2] == "") {
            logging.log(send_usage);
            return;
        }
        var message = parameters.slice(2).join(' ');

        //find the guild
        var guild = [];

        bot.guilds.forEach((search_guild) => {
            if (new RegExp(guild_ident, "gi").test(search_guild.id) || new RegExp(guild_ident, "gi").test(search_guild.name))
                guild.push(search_guild);
        });

        //if we found more than one, too ambiguous, don't send message
        if (guild.length > 1) {
            logging.log("Too ambiguous! Refine your guild search.")
            return;
        }

        //found none
        if (guild.length < 1) {
            logging.log("Guild not found! Refine your guild search.");
            return;
        }

        //we found the guild
        guild = guild[0];

        //attempt to get the channel
        var channel = [];

        guild.channels.forEach((search_channel) => {
            if (search_channel.type != "text") return;
            if (new RegExp(channel_id, "gi").test(search_channel.id))
                channel.push(search_channel);
        });

        //found more than one, too ambiguous
        if (channel.length > 1) {
            logging.log("Too ambiguous! Refine your channel search.");
            return;
        }

        //found none
        if (channel.length < 1) {
            logging.log("Channel not found! Refine your channel search.");
            return;
        }

        //found it
        channel = channel[0];

        //we have the channel, send the message
        try {
            await messaging.send(message, channel);
            logging.log(`Sent message to ${logging.guild_print(guild)} ${logging.guild_print(channel)}`);
        }
        catch (err) {
            setTimeout(async function() {
                throw err;
            });
        }

    }
    else if (subcommand === "channel") {
        var parameters = argv.slice(2);

        //get guild identifier
        if (parameters[0] === null) {
            logging.log(channel_usage);
            return;
        }

        var guild_ident = parameters[0];

        //get channel identifier
        if (parameters[1] === null) {
            logging.log(channel_usage);
            return;
        }

        var channel_ident = parameters[1];

        //find the guild to search channels
        var guild = [];

        bot.guilds.forEach((search_guild) => {
            if (new RegExp(guild_ident, 'gi').test(search_guild.id) || new RegExp(guild_ident, 'gi').test(search_guild.name))
                guild.push(search_guild);
        })

        //>1 too ambiguous
        if (guild.length > 1) {
            logging.log("Too ambiguous! Refine your guild search.");
            return;
        }

        //<1 not found
        if (guild.length < 1) {
            logging.log("Guild not found! Refine your guild search.");
            return;
        }

        //found
        guild = guild[0];

        //get list of channels matching search
        var channels = 0;
        guild.channels.forEach((search_channel) => {
            if (search_channel.type != "text") return;
            if (new RegExp(channel_ident, 'gi').test(search_channel.id) || new RegExp(channel_ident, 'gi').test(search_channel.name)) {
                channels += 1;
                logging.log(logging.guild_print(search_channel));
            }
        });

        //not found
        if (channels < 1) {
            logging.log("Channel not found! Refine your channel search.");
            return;
        }
        logging.log(`${channels} channels found matching search.`);
    }
    else {
        logging.log(usage);
    }
}
