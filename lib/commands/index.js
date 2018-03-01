//constants from main module
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const GLOB_CONFIG = index.config;
const logging = index.logging;
const messaging = index.messaging;

//aliases for the command to display all commands, which is not handled in a separate command
const COMMANDS_ALIASES = ["commands", "help"];

const reload = require('require-reload')(require);
const fs = require('fs');
const os = require('os');
const path = require('path');

//map command name to its module
var commands = new Map();

//store names of all commands and admin default status
var admin_defaults = {};

var reload_commands = function() {
    var returns = true;
    try {
        var dir_list = fs.readdirSync(__dirname);
        dir_list.forEach(file => {
            if (file == "index.js") return;
            file = file;
            var command_name = file.split(".")[0];

            commands.set(command_name, reload(path.resolve(__dirname, file)));

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
                    commands.set(alias, reload(path.resolve(__dirname, file)));

                    //alias shares default powers with main command
                    admin_defaults[alias] = admin_defaults[command_name];
                });
            }
        });
    }
    catch (err) {
        logging.log("Couldn't reload commands!");
        logging.err(err);
        returns = false;
    }
    return returns;
}

//create admin role for a guild if required
var guild_create_admin = function(config, message) {
    var returns = true;
    var edited = false;
    var guild = message.guild;
    if (typeof(config) === "undefined") {
        logging.log("Error creating admin role for guild! Config not found.");
        return false;
    }

    //need to create role in the guild itself
    if (!guild.roles.has(config.admin_role)) {
        guild.createRole({
            name: "Buttbot admins",
            color: [139,69,19],
            managed: true
        })
        .catch(err => {
            message.channel.send("Error creating admin role for guild! To use admin-only commands, make sure I have the permission \"MANAGE_ROLES\"");
            returns = false;
        })
        .then(role => {
            if (!returns) return;
            config.admin_role = role.id;
            try {
                fs.writeFileSync(path.resolve(GUILD_PATH, guild.id, 'config.json'), JSON.stringify(config), { flag: 'w' } );
            }
            catch (err) {
                logging.err(err);
                returns = false;
            }
        });
    }

    return returns;
}

var guild_create_admin_json = function(message) {
    var returns = true;
    var guild = message.guild;

    //look for already existing admin commands json
    //if we need to edit the JSON to add in new commands, this triggers fs.writefile
    var edited = false;
    var admin_json = {};
    try {

        //read existing json
        admin_json = JSON.parse(fs.readFileSync(path.resolve(GUILD_PATH, guild.id, 'admin_commands.json')));
    }
    catch (err) {
        //doesn't exist, just set to default
        admin_json = admin_defaults;
        edited = true;
    }

    //read through each key in defaults looking for values not in admin_json
    for (var key in admin_defaults) {

        if (!admin_defaults.hasOwnProperty(key)) continue;

        //find default key within guild json
        var found = false;
        for (var key2 in admin_json) {
            if (!admin_defaults.hasOwnProperty(key2)) continue;

            if (key == key2) {
                found = true;
                break;
            }
        }

        //key not found, add it to this json
        if (!found) {
            admin_json[key] = admin_defaults[key];
            edited = true; //mark that we need to write to file now
        }

    }

    //now write to file if we need to
    if (edited) {
        try {
            fs.writeFileSync(path.resolve(GUILD_PATH, guild.id, 'admin_commands.json'), JSON.stringify(admin_json), {flag: 'w'});
        }
        catch (err) {
            logging.err(err);
            returns = false;
        }
    }

    return returns;
}

//process incoming commands
exports.process = function(config, message, bot) {
    //check for new commands
    if (!reload_commands()) return;
    var content = message.content;

    //get command name as first entry in data
    //a command is always one word then a space then its args
    var command_name = content.split(" ")[0];
    //minus the prefix specified in config
    command_name = command_name.split(config.prefix)[1];

    //we are calling the help command
    if (COMMANDS_ALIASES.indexOf(command_name.toLowerCase()) > -1) {
        var response = "Available commands: ";

        var admin_commands = {};

        try {
            if (!guild_create_admin_json(message)) throw new Error("Cannot create admin_commands.json for guild!");
            var admin_commands = JSON.parse(fs.readFileSync(path.resolve(GUILD_PATH, message.guild.id, 'admin_commands.json')));
        }
        catch (err) {
            logging.err(err);
        }

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
                logging.log("Cannot find bot in guild!");
                return;
            }
            //check the permissions
            if (!member.permissions.has(commands.get(command_name).permissions, true)) {
                messaging.send("Error: I don't have the correct permissions for this command! (Permissions I need: " + commands.get(command_name).permissions.toString() + ")", message.channel);
                return;
            }
        }

        //now check if command is admin-only
        try {
            if (!guild_create_admin_json(message)) throw new Error("Cannot create admin_commands.json for guild!");
            var admin_commands = JSON.parse(fs.readFileSync(path.resolve(GUILD_PATH, message.guild.id, 'admin_commands.json')));

            //check if the command is admin only
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
                //create admin role
                if (!guild_create_admin(config, message)) return;

                var admin_role = config.admin_role;
                if (!message.guild.roles.has(admin_role)) {
                    throw new Error("Admin role not found!");
                }

                //not a member of admin role, so tell them they can't use the command
                if (!message.member.roles.has(admin_role)) {
                    messaging.send("Error: you must be a member of the Buttbot admins role to use this command!", message.channel);
                    return;
                }
                else {
                    found_command = false;
                }

            }

            //if found_command is false, we can execute this command
            if (!found_command) {
                //command exists, permissions exist, admin commands exist, correct role, process it
                commands.get(command_name).process(config, message);
            }
        }
        catch (err) {
            logging.err(err);
        }
    }
    //otherwise, command doesnt exist
    else {
        messaging.send("Invalid command: " + command_name + "!", message.channel);
        return;
    }
}
