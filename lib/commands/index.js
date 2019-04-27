//constants from main module
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
const config = index.config;
const sql = index.sql;
var bot = index.bot;

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

var reload_commands = async function() {
    var dir_list = await readdir(__dirname);
    dir_list.forEach(file => {
        if (file == "index.js" || file === ".sonarlint") return;

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
    var guild = config.guild.fromChannel(message.channel);

    //no admin role in non-guild
    if (guild === message.channel) {
        return null;
    }

    //find the admin role
    var admin_role = await sql.roles.admin.get(guild.id);
    admin_role = await guild.roles.get(admin_role);

    //if not found, check if there is one with the name (but not proper cfg setup)
    if (admin_role === null || admin_role === undefined) {
        admin_role = await guild.roles.find(search_role => search_role.name === "Buttbot admins");
        if (admin_role === null || admin_role === undefined)
            //if still not found, create it
            try {
                admin_role = await guild.createRole({
                    name: "Buttbot admins",
                    color: [139,69,19],
                    managed: true
                });
            }
            catch (err) {
                messaging.send("Could not create admin role for guild! To use admin-only commands, make sure I have the permission \"MANAGE_ROLES\"", message.channel, message.author, message);
                return null;
            }
        if (admin_role == null || !admin_role)
            throw new Error("Could not get admin role for guild!");

        await sql.roles.admin.save(admin_role.id, guild.id);
    }
    return admin_role;
}

var need_admin_role = async function(command, message) {

    //if the command doesn't need admin, don't deal with the rest of this
    if (!command.requires_admin) {
        return false;
    }

    //create admin role or get it if it exists
    var admin_role = await guild_create_admin(message);
    if (message.guild == null) {
        return false;
    }

    if (admin_role === null || admin_role === undefined) {
        return true;
    }

    //sanity check
    if (!message.guild.roles.has(admin_role.id)) {
        throw new Error("Admin role not found!");
    }

    //not a member of admin role, so tell them they can't use the command
    if (!message.member.roles.has(admin_role.id)) {
        messaging.send("Error: you must be a member of the \"" + admin_role.name + "\" role to use this command!", message.channel, message.author, message);
        return true;
    }
    else {
        return false;
    }
}

//process incoming commands
exports.process = async function(message) {
    //check for new commands
    var content = message.content;
    var guild = config.guild.fromChannel(message.channel);
    var command_name = await sql.command.find_name(guild.id, content);

    if (command_name === null || command_name === undefined) {
        messaging.send("Invalid command!", message.channel, message.author, message);
        return;
    }

    var command_id = await sql.command.get_id(command_name);

    if (command_id === null || command_id === undefined) {
        messaging.send("Invalid command!", message.channel, message.author, message);
        return;
    }

    //ensure the command is in the table before getting it
    await sql.command.update_guild_command(guild.id, command_id);
    var commands = await sql.command.get_all_admin(guild.id);

    var command = commands.filter((arr_command) => {
        return (arr_command.command_id === command_id);
    });

    if (command === null || command === undefined || command.length === 0) {
        messaging.send("Invalid command!", message.channel, message.author, message);
        return;
    }

    command = command[0];

    //check permissions if we have to (in a guild)
    if (message.guild !== null && message.guild !== undefined) {
        var permissions = await sql.command.get_permissions(command_id);
        var bot_member = message.guild.members.find(member => member.user.id == bot.user.id);
        if (bot_member == null) {
            messaging.send("An unexpected error occurred!", message.channel, message.author, message);
            throw new Error("Cannot find bot in guild!");
        }
        //check the permissions
        if (permissions !== null &&
            permissions !== undefined &&
            permissions.length !== 0 &&
            !bot_member.permissions.has(permissions, true)) {
            messaging.send("Error: I don't have the correct permissions for this command! (Permissions I need: " + permissions.toString() + ")", message.channel, message.author, message);
            return;
        }
        //check admin
        var need_admin = await need_admin_role(command, message);
        if (need_admin !== false) {
            return;
        }
    }

    //get our command path for execution
    reload(path.resolve(command.command_path)).process(message);
    return;
}
