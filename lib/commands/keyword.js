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

const VALID_SUBPARMS = ["keep", "delete", "edit"];

exports.description = "Manage buttbot keywords. Comes with 3 subcommands: add, list, and delete.";

var usage = "```Usage: keyword [add, list, delete, help] (\"keyword help [add, list, delete]\" to learn more!)```";

var addusage = "```Usage: keyword add \"keyword (can have spaces)\" [keep, delete, edit] [what to say in response or replace keyword with (optional)]" + os.EOL +
               "Keep - do not modify the speaker's message, and say a response." + os.EOL +
               "Delete - delete the speaker's message (if allowed), and say a response." + os.EOL +
               "Edit - replace the speaker's message with a modified version of their message.```";

var listusage = "```Usage: keyword list [keyword (can have spaces, optional)]" + os.EOL +
                "View all keywords or keywords which match the optionally specified keyword.```";

var delusage = "```Usage: keyword delete keyword (can have spaces)" + os.EOL +
               "Delete a keyword from the list of watched keywords.```";

exports.process = function(config, message) {
    var argv = message.content.split(" ");

    //ignore invalid input
    if (argv[1] == null || argv[1] == "") {
        messaging.send(usage, message.channel);
        return;
    }
    var subcommand = argv[1].toLowerCase();

    //display help
    if (subcommand == "help") {

        var help_command = argv[2];

        if (help_command == "add") {
            messaging.send(addusage, message.channel);
            return;
        }
        if (help_command == "list") {
            messaging.send(listusage, message.channel);
            return;
        }
        if (help_command == "delete") {
            messaging.send(delusage, message.channel);
            return;
        }
        else {
            messaging.send(usage, message.channel);
            return;
        }

    }

    //handle adding a keyword
    else if (subcommand == "add") {
        var keyword = argv[2];

        //if there's no keyword exit
        if (keyword == null || keyword == "") {
            messaging.send(addusage, message.channel);
            return;
        }

        keyword = keyword.toLowerCase();

        //grab the actual keyword
        keyword = message.content.split('"')[1];

        //if no keyword in quotes exit
        if (keyword == "" || keyword == null) {
            messaging.send("Error: no keyword found!" + os.EOL + addusage, message.channel);
            return;
        }

        keyword = keyword.toLowerCase();

        var after_keyword = message.content.split('"')[2];

        //no subparms, exit
        if (after_keyword == "" || after_keyword == null) {
            messaging.send("Error: no subparameters specified after keyword!" + os.EOL + addusage, message.channel);
            return;
        }


        var subparm = after_keyword.split(' ')[1];

        //incorrectly formatted subparms, exit
        if (subparm == "" || subparm == null) {
            messaging.send("Error: no subparameters specified after keyword!" + os.EOL + addusage, message.channel);
            return;
        }

        subparm = subparm.toLowerCase();

        //invalid subparm, exit
        if (VALID_SUBPARMS.indexOf(subparm) == -1) {
            messaging.send("Error: invalid subparameter specified after keyword: " + subparm + "!" + os.EOL + addusage, message.channel);
            return;
        }

        var after_text = after_keyword.split(' ').slice(2).join(' ');

        var keyword_obj = {
            "keyword" : keyword,
            "subparm" : subparm,
            "after_text" : after_text
        };

        //write the object to the file
        try {
            var keywords_path = path.resolve(GUILD_PATH, message.guild.id, 'keywords.json');
            var duplicate = false;

            //read in existing keywords
            try {
                var keywords = fs.readFileSync(keywords_path).toString().split(os.EOL);

                //check for duplicate
                keywords.forEach(exist_keyword => {
                    if (exist_keyword.toLowerCase() == JSON.stringify(keyword_obj).toLowerCase()) {
                        duplicate = true;
                    }
                });
            }
            catch (err) {

            }

            if (duplicate) {
                messaging.send("Keyword not added: keyword defintion already exists!", message.channel);
            }
            else {
                fs.writeFileSync(keywords_path, JSON.stringify(keyword_obj) + os.EOL, {flag: 'a'});
                messaging.send("Keyword added successfully!", message.channel);
            }

        }
        catch (err) {
            logging.err(err);
            messaging.send("Error adding keyword! Keyword not added to set of keywords.", message.channel);
        }
    }

    //handle listing keywords
    else if (subcommand == "list") {

        var keyword = message.content.split(" ").splice(2).join(" ");

        if (keyword != null) {
            keyword = keyword.toLowerCase();
        }

        try {
            var data = fs.readFileSync(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'))
            var response = "";
            data.toString().split(os.EOL).forEach(line => {
                if (line == null || line == "") return;
                line = JSON.parse(line);
                if (line.keyword.match(keyword) || keyword == null) {
                    response += line.keyword + " [" + line.subparm + "]: " + line.after_text + os.EOL;
                }
            });
            if (response == "") {
                if (keyword == "" || keyword == null) {
                    response = "No keywords defined for this channel!";
                }
                else {
                    response = "No keywords match your search: " + keyword + "!";
                }
            }
            messaging.send("```" + response + "```", message.channel);
        }
        catch (err) {
            messaging.send("No keywords defined for this channel!", message.channel);
            logging.err(err);
        }

    }

    //handle deleting keywords
    else if (subcommand == "delete") {

        var keyword = message.content.split(" ").splice(2).join(" ");

        if (keyword == null || keyword == "") {
            messaging.send(delusage, message.channel);
            return;
        }

        try {
            var data = fs.readFileSync(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'))
            var output = "";
            var deleted = false;
            data.toString().split(os.EOL).forEach(line => {
                if (line == null || line == "") return;
                jline = JSON.parse(line);
                if (!jline.keyword.match(keyword)) {
                    output += line + os.EOL;
                }
                else {
                    deleted = true;
                }
            });
            if (!deleted) messaging.send("No keywords match: " + keyword + " to delete!", message.channel);
            else {
                fs.writeFileSync(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'), output, {flag: "w"});
                messaging.send("Keyword deleted successfully!", message.channel);
            }
        }
        catch (err) {
            messaging.send("No keywords defined for this channel!", message.channel);
            logging.err(err);
        }

    }

    //send usage if invalid subcommand
    else {
        messaging.send(usage, message.channel);
    }
}
