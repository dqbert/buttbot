//constants from main module
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
const config = index.config;

//aliases for the command to display all commands, which is not handled in a separate command
const COMMANDS_ALIASES = ["commands", "help"];

const reload = require('require-reload')(require);
const fs = require('fs');
const os = require('os');
const path = require('path');
const discord = require('discord.js');
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

//map command name to its module
var commands = new Map();

//store names of all commands and admin default status
var admin_defaults = {};

var reload_commands = async function() {
    var dir_list = await readdir(__dirname);
    dir_list.forEach(file => {
        if (file == "index.js") return;

        var command_name = file.split(".")[0];
        var command_path = path.resolve(__dirname, file);
        commands.set(command_name, reload(command_path));

        //determine if this commmand requires admin powers
        if (commands.get(command_name).requires_admin == null || commands.get(command_name).requires_admin == false) {
            admin_defaults[command_name] = false;
        }
        else {
            admin_defaults[command_name] = true;
        }

        //also set all aliases
        if (typeof(commands.get(command_name).aliases) !== "undefined")
        {
            commands.get(command_name).aliases.forEach((alias, index, command) => {
                commands.set(alias, reload(command_path));

                //alias shares default powers with main command
                admin_defaults[alias] = admin_defaults[command_name];
            });
        }
    });
}

//create admin role for a guild if required
var guild_create_admin = async function(message) {
    var edited = false;
    var guild = message.guild;

    //load our config
    var guild_cfg = await config.guild.get(guild);

    //need to create role in the guild itself
    var role = guild.roles.get(guild_cfg.admin_role);
    if (role == null || !role) {
        try {
            role = await guild.createRole({
                name: "Buttbot admins",
                color: [139,69,19],
                managed: true
            });
            guild_cfg.admin_role = role.id;
            config.guild.save(guild_cfg, guild);
        }
        catch (err) {
            message.channel.send("Error creating admin role for guild! To use admin-only commands, make sure I have the permission \"MANAGE_ROLES\"");
            setTimeout(async function() {
                throw err;
            });
        }
    }
    return role;
}

//process incoming commands
exports.process = async function(message, bot) {
    //check for new commands
    await reload_commands();
    var content = message.content;
    var guild_cfg = await config.guild.get(message.guild);

    //if we got here via a mention, change it to prefix form for compatibility
    if (content.indexOf('<@' + bot.user.id + '>') == 0) {
        content = content.split('<@' + bot.user.id + '>')[1];
        if (content == null) return;
        content = content.trim();
        content = guild_cfg.prefix + content;

        //update the content for compatibility
        message.content = content
    }

    //get command name as first entry in data
    //a command is always one word then a space then its args
    //minus the prefix specified in config
    var command_name = content.split(" ")[0].split(guild_cfg.prefix)[1];

    //we are calling the help command
    if (COMMANDS_ALIASES.indexOf(command_name.toLowerCase()) > -1) {
        var response = "Available commands: ";

        var admin_commands = await config.admin.get(message.guild, admin_defaults);

        commands.forEach((command, key) => {
            var admin_required = "";
            if (admin_commands.hasOwnProperty(key)) {
                if (admin_commands[key] == true) admin_required = " [Requires admin]";
            }
            if (typeof(command.description) === "undefined") {
                response += os.EOL + "- " + key + admin_required + ": No valid description specified in " + key + ".js!";
            }
            else {
                response += os.EOL + "- " + key + admin_required + ": " + command.description;
            }
        });

        COMMANDS_ALIASES.forEach((command) => {
            response += os.EOL + "- " + command + ": Access this help dialog.";
        });

        messaging.send(response, message.channel);
    }

    //check if command exists
    else if (commands.has(command_name)) {
        //check if we have the permissions to use that command
        if (commands.get(command_name).permissions != null) {
            //find the guildmember for our bot
            var member = message.guild.members.find(member => member.user.id == bot.user.id);
            if (member == null) {
                throw new Error("Cannot find bot in guild!");
            }
            //check the permissions
            if (!member.permissions.has(commands.get(command_name).permissions, true)) {
                messaging.send("Error: I don't have the correct permissions for this command! (Permissions I need: " + commands.get(command_name).permissions.toString() + ")", message.channel);
                return;
            }
        }

        //now check if command is admin-only
        var admin_commands = await config.admin.get(message.guild, admin_defaults);
        var found_command = false;

        for (var key in admin_commands) {
            if (!admin_commands.hasOwnProperty(key)) continue;
            if (key == command_name) {
                if (admin_commands[key] == true) found_command = true;
                break;
            }
        }

        //command is admin only, so we need to check if user is member of admin role
        if (found_command) {
            //create admin role or get it if it exists
            var admin_role = await guild_create_admin(message);

            //sanity check
            if (!message.guild.roles.has(admin_role.id)) {
                throw new Error("Admin role not found!");
            }

            //not a member of admin role, so tell them they can't use the command
            if (!message.member.roles.has(admin_role.id)) {
                messaging.send("Error: you must be a member of the \"" + admin_role.name + "\" role to use this command!", message.channel);
                return;
            }
            else {
                found_command = false;
            }

        }

        //by this point, found_command = false if:
        //1. we are admin and this command requires admin
        //2. this command does not require admin
        if (!found_command) {
            commands.get(command_name).process(message);
        }
    }
    //otherwise, command doesnt exist
    else {
        messaging.send("Invalid command: " + command_name + "!", message.channel);
        return;
    }
}
