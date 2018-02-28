//constants from main module
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
//aliases for the command to display all commands, which is not handled in a separate command
const COMMANDS_ALIASES = ["commands", "help"];

const reload = require('require-reload')(require);
const fs = require('fs');
const path = require('path');
const os = require('os');

var commands = new Map();

var reload_commands = function() {
    var returns = true;
    try {
        var dir_list = fs.readdirSync(__dirname);
        dir_list.forEach(file => {
            if (file == "index.js") return;
            file = file;
            var command_name = file.split(".")[0];

            commands.set(command_name, reload(path.resolve(__dirname, file)));

            //also set all aliases
            if (typeof(commands.get(command_name).aliases) !== "undefined")
            {
                commands.get(command_name).aliases.forEach((alias, index, command) => {
                    commands.set(alias, command);
                });
            }
        });
    }
    catch (err) {
        logging.log("Couldn't reload console commands!");
        logging.err(err);
        returns = false;
    }
    return returns;
}

//process incoming console commands
exports.process = function(data) {
    //check for new commands
    if (!reload_commands()) return;

    //get command name as first entry in data
    //a command is always one word then a space then its args
    var command_name = data.split(" ")[0];

    //we are calling the help command
    if (COMMANDS_ALIASES.indexOf(command_name.toLowerCase()) > -1) {
        logging.log("Available console commands: ");
        commands.forEach((command, key) => {
            if (typeof(command.description) === "undefined") {
                logging.log("- " + key + ": No valid description specified in " + key + ".js!");
            }
            else {
                logging.log("- " + key + ": " + command.description);
            }
        });
        COMMANDS_ALIASES.forEach((command) => {
            logging.log("- " + command + ": Access this help dialog.");
        });
    }
    //check if command exists
    else if (commands.has(command_name)) {
        //command exists, process it
        commands.get(command_name).process(data);
    }
    //otherwise, command doesnt exist
    else {
        logging.log("Invalid command: " + command_name + "!");
        return;
    }
}
