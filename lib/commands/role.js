//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
const config = index.config;
const sql = index.sql;
var bot = index.bot;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const discord = require('discord.js');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const VALID_SUBPARMS = ["join", "leave", "create", "delete", "list", "manage", "help"];

exports.description = "Join or leave a user from a buttbot managed role. Create, delete, and list buttbot managed roles. Toggle buttbot management of a role.";

exports.permissions = ["SEND_MESSAGES", "MANAGE_ROLES"];

exports.requires_admin = true;

const usage    = "```Use the command role help [join/leave/create/delete/list/manage/help] to learn more!```";
const joiusage = "```role join \"[role name]\" \"[username]\" - Join a user to a buttbot managed role." + os.EOL +
                 "If username was left out, then you (the message sender) will join the role.```";
const leausage = "```role leave \"[role name]\" \"[username]\" - Leave a user from a buttbot managed role." + os.EOL +
                 "If username was left out, then you (the message sender) will leave the role.```";
const creusage = "```role create \"[role name]\" - Create a buttbot managed role.```";
const delusage = "```role delete \"[role name]\" - Delete a buttbot managed role.```";
const lisusage = "```role list \"[role name]\" - Search for roles matching [role name]." + os.EOL +
                 "If no [role name] is specified, this command will display all managed roles.```";
const manusage = "```role manage \"[role name]\" - Toggle managing a role." + os.EOL +
                 "Warning: If you begin managing a non-buttbot managed role, anyone who has permissions to use this command" +
                 "can join or leave users from that role, or even delete it! Use it wisely.```";

const SUBPARM_USAGE = [joiusage, leausage, creusage, delusage, lisusage, manusage];

exports.process = async function(message) {

    //ensure we are in a guild, no roles in DM
    if (message.guild === null || message.guild === undefined) {
        messaging.send("You cannot manage roles in a non-guild channel.", message.channel, message.author, message);
        return;
    }

    //any time role based command is ran,
    //we should check the list of roles on the guild
    //and also the roles we manage
    //if we manage any that do not exist on the guild, then remove them

    //get our managed roles
    var managed_roles = await sql.roles.get(message.guild.id);

    //find roles to remove
    managed_roles.reverse().forEach(function(f_role, f_ind) {
        if (!(message.guild.roles.has(f_role.role_id))) {
            sql.roles.remove(f_role.role_id, f_role.guild_id);
            managed_roles.splice(f_ind,1);
        }

        if ((!message.guild.roles.some(g_role => g_role.name.toLowerCase() === f_role.role_name.toLowerCase())) && message.guild.roles.has(f_role.role_id)) {
            var new_name = message.guild.roles.get(f_role.role_id).name;
            sql.roles.add(f_role.role_id, message.guild.id, f_role.user_id, new_name, f_role.role_date);
            managed_roles[f_ind].role_name = new_name;
        }
    });

    if (managed_roles === null || managed_roles === undefined) {
        messaging.send("‼️ An unexpected error occurred. Join the help guild (run the buttbot command \"help\") and message @dqbert#0903 about it. ‼️", message.channel, message.author, message);
        throw new Error("Managed_roles was null!");
    }

    //get the subcommand
    var argv = message.content.split(" ");
    var subcommand = argv[1];

    if (subcommand === null || subcommand === undefined || subcommand === "") {
        messaging.send(usage, message.channel, message.author, message);
        return;
    }

    subcommand = subcommand.toLowerCase();

    if (VALID_SUBPARMS.indexOf(subcommand) === -1) {
        messaging.send("Error: Invalid subcommand: " + subcommand + os.EOL + usage, message.channel, message.author, message);
        return;
    }

    //user wanted help with a subcommand
    if (subcommand === "help") {
        subcommand = argv[2];

        if (subcommand === null || subcommand === undefined || subcommand === "" || VALID_SUBPARMS.indexOf(subcommand) === -1) {
            messaging.send(usage, message.channel, message.author, message);
            return;
        }

        messaging.send(SUBPARM_USAGE[VALID_SUBPARMS.indexOf(subcommand)], message.channel, message.author, message);

        return;

    }

    var my_usage = SUBPARM_USAGE[VALID_SUBPARMS.indexOf(subcommand)];

    if (subcommand === "join" || subcommand === "leave") {

        //get the role name and username
        var quote_argv = message.content.split("\"");

        //message should be like
        //role [join/leave] "[role name]" "[user name]"
        //splits like this
        //[0] role [join/leave]
        //[1] [role name]
        //[2] (space)
        //[3] [user name]

        var role_n = quote_argv[1];
        var user_n = quote_argv[3];

        var user = null;

        if (role_n === null || role_n === undefined || role_n === "") {
            messaging.send("Error: No role name specified!" + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        if (user_n === null || user_n === undefined || user_n === "") {
            user = message.author;
        }

        //ensure role name is valid (exists in roles)
        var role = message.guild.roles.find(role_t => role_t.name.toLowerCase() === role_n.toLowerCase());

        if (role === null || role === undefined) {
            messaging.send("Error: No role exists with name: " + role_n + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role is managed
        if (!(managed_roles.some(f_role => f_role.role_name.toLowerCase() === role_n.toLowerCase()))) {
            messaging.send("Error: Role \"" + role.role_name + "\" is not managed by buttbot", message.channel, message.author, message);
            return;
        }

        //if user = null (username specified) ensure username is valid as username or nickname or mention
        if (user === null) {
            //mention = <@[user id]>
            if (user_n.startsWith('<@')) {
                user_n = user_n.substring(user_n.indexOf('@'), user_n.indexOf('>'));
                user = message.guild.members.get(user_n);
            }
            else {
                user = message.guild.members.find(user_t => user_t.user.username.toLowerCase() === user_n.toLowerCase());

                //not found by username, get by nickname
                if (user === null || user === undefined) {
                    user = message.guild.members.find(user_t =>
                        user_t.nickname !== null &&
                        user_t.nickname !== undefined &&
                        user_t.nickname.toLowerCase() === user_n.toLowerCase());
                }
            }
        }

        //if user = null or undefined at this point, we failed
        if (user === null || user === undefined) {
            messaging.send("Error: No user exists with name or nickname: " + user_n + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure we have a user not a guildmember
        if (!(user instanceof discord.User)) {
            user = user.user;
        }

        //do the join or leave
        //if join, check if the role does not exist or the target is in the role or the role not managed, don't join if either true
        if (subcommand === "join") {
            //check if the target is not in the role
            if (role.members.some(f_user => f_user.user.id === user.id)) {
                messaging.send("User " + user.username + " is already in the role " + role_n, message.channel, message.author, message);
                return;
            }

            //not in role, join to role
            message.guild.member(user).addRole(role, "Buttbot managed role join");

            messaging.send(user.username + " joined to " + role.name, message.channel, message.author, message);

            return;
        }
        //if leave, check if the role exists and the target is in the role, don't join if either false
        else if (subcommand === "leave") {
            //check if the target is in the role
            if (!role.members.some(f_user => f_user.user.id === user.id)) {
                messaging.send("User " + user.username + " is not in the role " + role_n, message.channel, message.author, message);
                return;
            }

            //in role, delete from role
            message.guild.member(user).removeRole(role, "Buttbot managed role leave");

            messaging.send(user.username + " left " + role.name, message.channel, message.author, message);

            return;

        }

        return;

    }
    //if create, check if a role with the same name exists
    else if (subcommand === "create") {

        //get the role name and username
        var quote_argv = message.content.split("\"");

        //message should be like
        //role [create] "[role name]"
        //splits like this
        //[0] role create
        //[1] [role name]

        var role_n = quote_argv[1];

        if (role_n === null || role_n === undefined || role_n === "") {
            messaging.send("Error: No role name specified!" + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role name is invalid (does not exist in roles)
        var role = message.guild.roles.find(role_t => role_t.name.toLowerCase() === role_n.toLowerCase());

        if (!(role === null || role === undefined)) {
            messaging.send("Error: Role already exists: " + role_n + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role isn't managed
        if (managed_roles.some(f_role => f_role.role_name.toLowerCase() === role_n.toLowerCase())) {
            messaging.send("Error: Role is already managed", message.channel, message.author, message);
            return;
        }

        //create the role
        try {
            role = await message.guild.createRole({
                "name" : role_n,
                "mentionable" : true
            }, "Buttbot managed role");
        }
        catch (error) {
            messaging.send("Could not create role!", message.channel, message.author, message);
            setTimeout(async function() {
                throw err;
            });
        }

        //TODO: handle errors here
        sql.roles.add(role.id, message.guild.id, message.author.id, role.name, role.createdAt);
        messaging.send("Created new managed role <@&" + role.id + ">", message.channel, message.author, message);
        return;

    }
    //if delete, check if that role exists and is managed by buttbot
    else if (subcommand === "delete") {

        //get the role name and username
        var quote_argv = message.content.split("\"");

        //message should be like
        //role [delete] "[role name]"
        //splits like this
        //[0] role delete
        //[1] [role name]

        var role_n = quote_argv[1];

        if (role_n === null || role_n === undefined || role_n === "") {
            messaging.send("Error: No role name specified!" + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role name is valid (exists in roles)
        var role = message.guild.roles.find(role_t => role_t.name.toLowerCase() === role_n.toLowerCase());

        if (role === null || role === undefined) {
            messaging.send("Error: No role exists with name: " + role_n + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role is managed
        if (!(managed_roles.some(f_role => f_role.role_name.toLowerCase() === role_n.toLowerCase()))) {
            messaging.send("Error: Role \"" + role.name + "\" is not managed by buttbot", message.channel, message.author, message);
            return;
        }

        //role managed, delete it
        try {
            await role.delete("Buttbot managed role removal");
        }
        catch (error) {
            messaging.send("Could not delete role!", message.channel, message.author, message);
            setTimeout(async function() {
                throw err;
            });
        }

        //it's deleted, now remove from managed roles
        //TODO: handle errors here
        sql.roles.remove(role.id, message.guild.id);
        messaging.send("Deleted role: " + role.name, message.channel, message.author, message);
        return;

    }
    //if list, list buttbot managed roles
    else if (subcommand === "list") {

        //get the role name and username
        var quote_argv = message.content.split("\"");

        //message should be like
        //role [list] "[role name]"
        //splits like this
        //[0] role list
        //[1] [role name]

        var role_n = quote_argv[1];

        //search through just our JSON for all roles
        //that are like our role (not necessarily equal to)

        if (managed_roles.length === 0) {
            messaging.send("No roles are being managed on this server!", message.channel, message.author, message);
            return;
        }

        var found_roles = managed_roles.filter(role => new RegExp(role_n).test(role.role_name));

        if (found_roles.length === 0) {
            messaging.send("No roles found matching search: " + role_n, message.channel, message.author, message);
            return;
        }

        var role_m = ""

        found_roles.forEach((f_role, f_ind) => role_m = role_m + "[" + (f_ind + 1) + "]: " + f_role.role_name + os.EOL);

        messaging.send("Found managed roles:" + os.EOL + "```" + role_m + "```", message.channel, message.author, message);

        return;

    }
    //if manage, toggle managing a role
    else if (subcommand === "manage") {

        //get the role name and username
        var quote_argv = message.content.split("\"");

        //message should be like
        //role [manage] "[role name]"
        //splits like this
        //[0] role manage
        //[1] [role name]

        var role_n = quote_argv[1];

        if (role_n === null || role_n === undefined || role_n === "") {
            messaging.send("Error: No role name specified!" + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //ensure role name is valid (exists in roles)
        var role = message.guild.roles.find(role_t => role_t.name.toLowerCase() === role_n.toLowerCase());

        if (role === null || role === undefined) {
            messaging.send("Error: No role exists with name: " + role_n + os.EOL + my_usage, message.channel, message.author, message);
            return;
        }

        //now check if role is managed
        //evaluates to true in the case the role is managed
        if (managed_roles.some(f_role => f_role.role_name.toLowerCase() === role_n.toLowerCase())) {
            //unmanage the role
            //TODO: handle errors here
            sql.roles.remove(role.id, message.guild.id);
            messaging.send("No longer managing " + role.name, message.channel, message.author, message);
        }
        else {
            //manage the role
            //TODO: handle errors here
            sql.roles.add(role.id, message.guild.id, message.author.id, role.name, role.createdAt);
            messaging.send("Now managing " + role.name, message.channel, message.author, message);
        }
        return;

    }

}
