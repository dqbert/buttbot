//constants from index.js
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
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

exports.description = "Guild [list, users, config, admin, keywords]";

var usage = exports.description;
var user_usage = "Guild users guild: [guild name or guild id] user: [username or user id]";

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
    if (subcommand == "users") {
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
    else {
        logging.log(usage);
    }
}
