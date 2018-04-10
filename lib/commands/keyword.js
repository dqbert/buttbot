//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const messaging = index.messaging;
var bot = index.bot;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const VALID_SUBPARMS = ["keep", "delete", "edit", "notify"];

exports.description = "Manage buttbot keywords. Comes with 3 subcommands: add, list, and delete.";

exports.permissions = ["SEND_MESSAGES", "MANAGE_MESSAGES", "ADD_REACTIONS"];

var usage = "```Usage: keyword [add, list, delete, help] (\"keyword help [add, list, delete]\" to learn more!)```";

var addusage = "```Usage: keyword add \"keyword (can have spaces)\" [keep, delete, edit] [what to say in response or replace keyword with (optional)]" + os.EOL +
               "Keep - do not modify the speaker's message, and say a response." + os.EOL +
               "Delete - delete the speaker's message (if allowed), and say a response." + os.EOL +
               "Edit - replace the speaker's message with a modified version of their message." + os.EOL +
               "Notify - have buttbot mention you in a message whenever that keyword is sent by a user.```";

var listusage = "```Usage: keyword list [keyword (can have spaces, optional)]" + os.EOL +
                "View all keywords or keywords which match the optionally specified keyword.```";

var delusage = "```Usage: keyword delete [keyword (can have spaces)]" + os.EOL +
               "Delete a keyword from the list of watched keywords.```";

exports.process = async function(message) {
    var argv = message.content.split(" ");

    //ignore invalid input
    if (argv[1] == null || argv[1] == "") {
        messaging.send(usage, message.channel, message.author);
        return;
    }

    //get keyword subcommand
    var subcommand = argv[1].toLowerCase();

    //display help
    if (subcommand == "help") {

        var help_command = argv[2];

        if (help_command == "add") {
            messaging.send(addusage, message.channel, message.author);
            return;
        }
        if (help_command == "list") {
            messaging.send(listusage, message.channel, message.author);
            return;
        }
        if (help_command == "delete") {
            messaging.send(delusage, message.channel, message.author);
            return;
        }
        else {
            messaging.send(usage, message.channel, message.author);
            return;
        }

    }

    //handle adding a keyword
    else if (subcommand == "add") {
        var keyword = argv[2];

        //if there's no keyword exit
        if (keyword == null || keyword == "") {
            messaging.send(addusage, message.channel, message.author);
            return;
        }

        keyword = keyword.toLowerCase();

        //grab the actual keyword
        keyword = message.content.split('"')[1];

        //if no keyword in quotes exit
        if (keyword == "" || keyword == null) {
            messaging.send("Error: no keyword found!" + os.EOL + addusage, message.channel, message.author);
            return;
        }

        keyword = keyword.toLowerCase();

        var after_keyword = message.content.split('"')[2];

        //no subparms, exit
        if (after_keyword == "" || after_keyword == null) {
            messaging.send("Error: no subparameters specified after keyword!" + os.EOL + addusage, message.channel, message.author);
            return;
        }


        var subparm = after_keyword.split(' ')[1];

        //incorrectly formatted subparms, exit
        if (subparm == "" || subparm == null) {
            messaging.send("Error: no subparameters specified after keyword!" + os.EOL + addusage, message.channel, message.author);
            return;
        }

        subparm = subparm.toLowerCase();

        //invalid subparm, exit
        if (VALID_SUBPARMS.indexOf(subparm) == -1) {
            messaging.send("Error: invalid subparameter specified after keyword: " + subparm + "!" + os.EOL + addusage, message.channel, message.author);
            return;
        }

        var after_text = after_keyword.split(' ').slice(2).join(' ');

        var keyword_obj = {
            "keyword" : keyword,
            "subparm" : subparm,
            "after_text" : after_text
        };

        //send a notification to the user who requested it rather than sending whatever after_text there was
        if (subparm == "notify") keyword_obj.after_text = "<@" + message.author.id + ">";

        //write the object to the file
        try {
            var keywords_path = path.resolve(GUILD_PATH, message.guild.id, 'keywords.json');
            var duplicate = false;

            //read in existing keywords
            var keywords = await readFile(keywords_path);
            keywords = keywords.toString().split(os.EOL);

            //check for duplicate
            keywords.forEach(exist_keyword => {
                if (exist_keyword.toLowerCase() == JSON.stringify(keyword_obj).toLowerCase()) {
                    duplicate = true;
                }
            });

            if (duplicate) {
                messaging.send("Keyword not added: keyword defintion already exists!", message.channel, message.author);
            }
            else {
                writeFile(keywords_path, JSON.stringify(keyword_obj) + os.EOL, {flag: 'a'});
                messaging.send("Keyword added successfully!", message.channel, message.author);
                messaging.send("```" + keyword_obj.keyword + " [" + keyword_obj.subparm + "]: " + keyword_obj.after_text + "```", message.channel, message.author);
            }

        }
        catch (err) {
            messaging.send("Error adding keyword! Keyword not added to set of keywords.", message.channel, message.author);
            setTimeout(async function() {
                throw err;
            });
        }
    }

    //handle listing keywords
    else if (subcommand == "list") {

        var keyword = message.content.split(" ").splice(2).join(" ");

        if (keyword != null) {
            keyword = keyword.toLowerCase();
        }

        //if user specified keyword in quotes, pull it from the quotes
        //but this is not mandatory
        orig_keyword = keyword;
        keyword = keyword.split('"')[1];

        if (keyword == null || keyword == "") {
            keyword = orig_keyword;
        }

        try {
            var data = await readFile(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'));
            var response = "";
            data.toString().split(os.EOL).forEach(line => {

                //ignore blank lines
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

            messaging.send("```" + response + "```", message.channel, message.author);
        }
        catch (err) {
            messaging.send("No keywords defined for this channel!", message.channel, message.author);
            setTimeout(async function() {
                throw err;
            });
        }

    }

    //handle deleting keywords
    else if (subcommand == "delete") {

        var keyword = message.content.split(" ").splice(2).join(" ");

        if (keyword == null || keyword == "") {
            messaging.send(delusage, message.channel, message.author);
            return;
        }

        orig_keyword = keyword;
        keyword = keyword.split('"')[1];

        if (keyword == null || keyword == "") {
            keyword = orig_keyword;
        }

        try {
            var data = await readFile(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'))
            var output = "";
            var deleted_response = "";

            data.toString().split(os.EOL).forEach(line => {

                //ignore blank lines
                if (line == null || line == "") return;
                jline = JSON.parse(line);

                if (!jline.keyword.match(keyword)) {
                    output += line + os.EOL;
                }
                else {
                    deleted_response += jline.keyword + " [" + jline.subparm + "]: " + jline.after_text + os.EOL;
                }
            });

            if (deleted_response == "") messaging.send("No keywords match: " + keyword + " to delete!", message.channel, message.author);

            else {
                writeFile(path.resolve(GUILD_PATH, message.guild.id, 'keywords.json'), output, {flag: "w"});
                messaging.send("Keywords deleted successfully!", message.channel, message.author);
                messaging.send("```" + deleted_response + "```", message.channel, message.author);
            }
        }
        catch (err) {
            messaging.send("No keywords defined for this channel!", message.channel, message.author);
            setTimeout(async function() {
                throw err;
            });
        }

    }

    //send usage if invalid subcommand
    else {
        messaging.send(usage, message.channel, message.author);
    }
}
