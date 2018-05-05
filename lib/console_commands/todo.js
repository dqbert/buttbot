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

exports.description = "Todo [add, delete, top, next, pending, approve, deny, move, reorder] [position, amount/new position]";

exports.process = async function(data, message) {
    //split up command name into argv
    var argv = data.split(" ");

    //get each line individually
    var lines = await readFile(todo_file)
    lines = lines.toString().split(os.EOL);

    var pending_lines = [];
    var real_lines = [];

    lines.forEach((line, key) => {
        if (line.trim() == "") {
            return;
        }

        //find lines which are not approved
        if (line.substring(0,9) == "[pending]") {
            //add into pending array
            pending_lines.push(line);
        }
        else {
            //add to real array
            real_lines.push(line);
        }
    });

    //set normal lines array
    lines = real_lines;

    //user wants to list entire file
    if (typeof(argv[1]) == "string") {
        argv[1] = argv[1].toLowerCase();
    }

    if (argv[1] == "all" || argv[1] == "" || argv[1] == null) {

        logging.log("Todo entries:");
        lines.forEach((line, key) => {
            if (line.trim() == "") return;
            key = key + 1;
            logging.log("[" + key + "] " + line);
        });
        if (lines.length == 0) {
            logging.log("No todo entries found!");
        }

    }

    else if (argv[1] == "delete" || argv[1] == "remove") {

        //check if the line is within the file
        if (argv[2] == null || argv[2] == "" || !(parseInt(argv[2]) - 1 in lines)) throw new Error("You must specify a valid line to delete!");

        //line exists, delete it
        lines.splice(parseInt(argv[2]) - 1, 1);

        //overwrite in file
        await writeFile(todo_file, lines.join(os.EOL), {flag: 'w'});

        logging.log("Deleted line successfully!");

        //log all entries again
        exports.process("todo");

    }

    else if (argv[1] == "add") {

        if (argv[2] == null || argv[2] == "") throw new Error("You must specify a line to add!");

        var position1 = lines.length;
        var position2 = 2;

        //use given position from command as opposed to default (end of array)
        if (!isNaN(parseInt(argv[position2]))) {
            position1 = parseInt(argv[position2]) - 1;
            position2 = 3;
        }

        //add line at bottom of array
        lines.splice(position1, 0, argv.slice(position2).join(' '));

        //overwrite in file
        writeFile(todo_file, lines.join(os.EOL), {flag: 'w'});

        logging.log("Added todo successfully!");

        //log all entries again
        exports.process("todo");

    }

    else if (argv[1] == "top" || argv[1] == "next") {
        if (argv[2] == null) {
            logging.log(lines[0]);
        }
        else if (isNaN(parseInt(argv[2]))) {
            throw new Error("Invalid parameter: " + argv[2] + " must be a valid integer!");
        }
        else {
            //log all of the lines asked for
            lines.splice(0, parseInt(argv[2])).forEach((line, key) => {
                key++;
                logging.log("[" + key + "] " + line);
            });
        }
    }

    //add a new pending suggestion or list all pending suggestions
    else if (argv[1] == "pending") {
        if (argv[2] == null) {
            logging.log("Todo entries pending:");
            pending_lines.forEach((line, key) => {
                key++;
                logging.log("[" + key + "] " + line.split(" ").splice(1).join(" "));
            });
            if (pending_lines.length == 0) {
                logging.log("No pending entries!");
            }
            return;
        }

        //add pending suggestion to suggestions
        pending_lines.push("[pending] " + argv.slice(2).join(" "));
        pending_lines.forEach((line, key) => {
            lines.push(line);
        });

        await writeFile(todo_file, lines.join(os.EOL), {flag: 'w'});

        logging.log("New pending suggestion!");
    }
    //approve a pending suggestion (make it no longer pending)
    else if (argv[1] == "approve") {
        if (argv[2] == null) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }
        if (isNaN(parseInt(argv[2]))) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }

        //get the index of this pending entry
        approve_ndx = parseInt(argv[2]) - 1;
        if (pending_lines[approve_ndx] == null || pending_lines[approve_ndx] == "") {
            throw new Error("Invalid parameter: (" + argv[2] + ") pending entry not found!");
        }

        //now convert it to a normal suggestion
        lines.push(pending_lines[approve_ndx].split("[pending]").splice(1).join(" ").trim());

        //remove it from pending
        pending_lines.splice(approve_ndx, 1);

        //save the lines
        await writeFile(todo_file, lines.join(os.EOL) + os.EOL + pending_lines.join(os.EOL), {flag: 'w'});


        logging.log("Suggestion approved successfully!");

        //log all entries again
        exports.process("todo pending");

    }
    else if (argv[1] == "deny") {
        if (argv[2] == null) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }
        if (isNaN(parseInt(argv[2]))) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }

        //get the index of this pending entry
        deny_ndx = parseInt(argv[2]) - 1;
        if (pending_lines[deny_ndx] == null || pending_lines[deny_ndx] == "") {
            throw new Error("Invalid parameter: (" + argv[2] + ") pending entry not found!");
        }

        pending_lines.splice(deny_ndx, 1);

        pending_lines.forEach(line => {
            lines.push(line);
        });

        await writeFile(todo_file, lines.join(os.EOL), {flag: 'w'});

        logging.log("Suggestion denied successfully!");

        //log all entries again
        exports.process("todo pending");
    }
    else if (argv[1] == "move" || argv[1] == "reorder") {
        if (argv[2] == null) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }
        if (isNaN(parseInt(argv[2]))) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }

        if (argv[3] == null) {
            throw new Error("Invalid parameter: (" + argv[3] + ") must be a valid integer!");
        }
        if (isNaN(parseInt(argv[3]))) {
            throw new Error("Invalid parameter: (" + argv[3] + ") must be a valid integer!");
        }

        origin_ndx = parseInt(argv[2]) - 1;
        new_ndx = parseInt(argv[3]) - 1;

        if (lines[origin_ndx] == null) {
            throw new Error("Invalid parameter: (" + argv[2] + ") entry not found!");
        }

        var old_line = lines[origin_ndx];
        lines[origin_ndx] = lines[new_ndx];
        lines[new_ndx] = old_line;

        await writeFile(todo_file, lines.join(os.EOL), {flag: 'w'});

        logging.log("List reordered successfully!");

        //log all entries again
        exports.process("todo");

    }
    else {
        throw new Error("Invalid subcommand " + argv[1]);
    }

}
