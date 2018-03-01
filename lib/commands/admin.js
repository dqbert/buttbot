//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');

var usage = "```Usage: admin [add/remove/toggle] [command name]```";

exports.description = "Manage admin commands";
exports.requires_admin = true;

exports.process = function(config, message) {
    var argv = message.content.split(" ");

    //list admin only commands
    if (argv[1] == null) {
        messaging.send(usage, message.channel);
        return;
    }

    var admin_commands = {};
    try {
        admin_commands = JSON.parse(fs.readFileSync(path.resolve(GUILD_PATH, message.guild.id, 'admin_commands.json')));

        //add a command to admin only
        if (argv[1].toLowerCase() == "add" || argv[1].toLowerCase() == "remove" || argv[1].toLowerCase() == "toggle") {
            if (argv[2] == null) {
                messaging.send(usage, message.channel);
                return;
            }

            var command_name = argv[2];
            if (!admin_commands.hasOwnProperty(command_name)) {
                messaging.send("Error: command " + command_name + " is not valid!", message.channel);
                return;
            }

            //turn admin only on
            if (argv[1].toLowerCase() == "add" || (argv[1].toLowerCase() == "toggle" && admin_commands[command_name] == false))
                admin_commands[command_name] = true;
            else
                admin_commands[command_name] = false;

            //save changes
            fs.writeFileSync(path.resolve(GUILD_PATH, message.guild.id, 'admin_commands.json'), JSON.stringify(admin_commands));

            var confirmation = "";
            if (admin_commands[command_name] == true) {
                confirmation = "Command \"" + command_name + "\" now requires admin role membership.";
            }
            else {
                confirmation = "Command \"" + command_name + "\" now does not require admin role membership.";
            }
            messaging.send(confirmation, message.channel);
        }
        else {
            messaging.send(usage, message.channel);
            return;
        }
    }
    catch (err) {
        logging.err(err);
    }
}
