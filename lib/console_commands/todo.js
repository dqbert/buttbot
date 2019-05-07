//constants from index.js
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const sql = index.sql;
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

//TODO: convert to use the new SQL functions
exports.process = async function(data, message) {
    //split up command name into argv
    var argv = data.split(" ");

    //user wants to list entire file
    if (typeof(argv[1]) == "string") {
        argv[1] = argv[1].toLowerCase();
    }

    if (argv[1] == "all" || argv[1] == "" || argv[1] == null)
    {
        var entries = await sql.todo.get();
        displayTodoEntries(entries);
    }

    else if (argv[1] == "delete" || argv[1] == "remove") {

        //check if the line is within the file
        if (argv[2] == null || argv[2] == "") throw new Error("You must specify a valid line to delete!");

        //attempt to delete it
        var result = await sql.todo.delete(argv[2]);

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            logging.log("Deleted line successfully!");

            //log all entries again
            exports.process("todo");
        }
        else
        {
            throw new Error("You must specify a valid line to delete!");
        }

    }

    else if (argv[1] == "add") {

        if (argv[2] == null || argv[2] == "") throw new Error("You must specify a line to add!");

        var result = await sql.todo.add(argv.slice(2).join(' '));

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            logging.log("Added todo successfully!");

            //log all entries again
            exports.process("todo");
        }
        else
        {
            throw new Error("Could not add line!");
        }

    }

    else if (argv[1] == "top" || argv[1] == "next") {
        if (argv[2] == null) {
            top = 1;
        }
        else {
            top = parseInt(argv[2]);
        }

        if (isNaN(top))
        {
            throw new Error("Invalid parameter: " + argv[2] + " must be a valid integer!");
        }

        var entries = await sql.todo.get(null, null, null, top);

        displayTodoEntries(entries);
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
    else if (argv[1] == "move" || argv[1] == "reorder" || argv[1] == "swap") {
        index1 = parseInt(argv[2]);
        index2 = parseInt(argv[3]);
        if (index1 == null || isNaN(index1))
        {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }
        if (index2 == null || isNaN(index2))
        {
            throw new Error("Invalid parameter: (" + argv[3] + ") must be a valid integer!");
        }

        var result = await sql.todo.swap(index1, index2);

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            logging.log("List reordered successfully!");

            //log all entries again
            exports.process("todo");
        }
        else
        {
            throw new Error(`Could not swap positions of ${index1} and ${index2}`);
        }

    }
    else {
        throw new Error("Invalid subcommand " + argv[1]);
    }

}

function displayTodoEntries(entries)
{
    logging.log("Todo entries:");

    entries.forEach((entry) => {
        logging.log("[" + entry.todo_index + "] " + entry.todo_text);
    });
    if (entries.length == 0) {
        logging.log("No todo entries found!");
    }
}
