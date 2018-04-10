//constants from main module
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
var bot = index.bot;
//aliases for the command to display all commands, which is not handled in a separate command
const COMMANDS_ALIASES = ["commands", "help"];

const reload = require('require-reload')(require);
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

var commands = new Map();

var reload_commands = async function() {
    var returns = true;

    var dir_list = await readdir(__dirname);

    dir_list.forEach(file => {
        if (file == "index.js") return;
        file = file;
        var command_name = file.split(".")[0];
        var command_path = path.resolve(__dirname, file);

        commands.set(command_name, reload(command_path));

        //also set all aliases
        if (typeof(commands.get(command_name).aliases) !== "undefined")
        {
            commands.get(command_name).aliases.forEach((alias, index, command) => {
                commands.set(alias, reload(command_path));
            });
        }
    });

}

//process incoming console commands
exports.process = async function(data, message) {
    //check for new commands
    await reload_commands();

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
        commands.get(command_name).process(data, message);
    }
    //otherwise, command doesnt exist
    else {
        logging.log("Invalid command: " + command_name + "!");
    }
}
