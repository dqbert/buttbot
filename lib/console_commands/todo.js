//constants from index.js
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const sql = index.sql;
const rest = index.rest;
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
    var pending = false;

    if (argv[1] == "apitest")
    {
        rest.issues.get();
        return;
    }

    //user wants to list entire file
    if (typeof(argv[1]) == "string") {
        argv[1] = argv[1].toLowerCase();
    }

    if (argv[1] == "pending") {
        pending = true;
        argv[1] = argv[0];
        argv.shift();
    }

    if (argv[1] == "all" || argv[1] == "" || argv[1] == null)
    {
        var entries = await rest.issues.get();
        logging.log(`Open${(pending ? " pending " : " ")}issues:`);
        entries.forEach((entry) => {
            var labelsJoin = [];
            var pending_found = false;
            entry.labels.forEach((label) => {
                if (label.name.toLowerCase() === "pending")
                {
                    pending_found = true;
                }
                labelsJoin.push(label.name);
            });
            if ((pending && pending_found) ||
                (!pending && !pending_found))
            {
                logging.log(`Issue name: ${entry.title}`);
                logging.log(`  Issue URL: ${entry.html_url}`);
                logging.log(`  Issue Labels: ${labelsJoin.join(", ")}`);
            }
        });
        //displayTodoEntries(entries);
    }

    else if (argv[1] == "delete" || argv[1] == "remove") {

        if (argv[2] == null || argv[2] == "") throw new Error("You must specify a valid line to delete!");

        //attempt to delete it
        var result = await sql.todo.delete(argv[2], pending);

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            logging.log("Deleted line successfully!");

            //log all entries again
            todoRedisplay(pending);

            //TODO: if this entry was pending, notify it has been denied??
        }
        else
        {
            throw new Error("You must specify a valid line to delete!");
        }

    }

    else if (argv[1] == "add") {

        if (argv[2] == null || argv[2] == "") throw new Error("You must specify a line to add!");
        var result;

        if (message instanceof discord.Message)
        {
            result = await sql.todo.add(argv.slice(2).join(' '), pending, message.author.id, config.guild.fromChannel(message.channel).id);
        }
        else
        {
            result = await sql.todo.add(argv.slice(2).join(' '), pending);
        }

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            if (pending === true)
            {
                logging.log("New pending suggestion!");
            }
            else
            {
                logging.log("Added todo entry successfully!");
            }

            //log all entries again
            todoRedisplay(pending);
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

        var entries = await sql.todo.get(null, null, null, top, pending);

        displayTodoEntries(entries);
    }

    //approve a pending suggestion (make it no longer pending)
    else if (argv[1] == "approve") {
        pending = true;
        if (argv[2] == null) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }
        if (isNaN(parseInt(argv[2]))) {
            throw new Error("Invalid parameter: (" + argv[2] + ") must be a valid integer!");
        }

        //get the index of this pending entry
        result = await sql.todo.approve(argv[2]);

        if (result === null || result === undefined)
        {
            throw new Error("You must specify a valid index to approve!");
        }

        logging.log("Suggestion approved!");

        //log all entries again
        todoRedisplay(pending);

        //TODO: if this entry was approved, notify it has been approved

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

        var result = await sql.todo.swap(index1, index2, pending);

        if (result !== null && result !== undefined && result.affectedRows > 0)
        {
            logging.log("List reordered successfully!");

            //log all entries again
            todoRedisplay(pending);
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

    entries.forEach((entry, index) => {
        index = index + 1;
        logging.log("[" + index + "] " + entry.todo_text);
    });
    if (entries.length == 0) {
        logging.log("No todo entries found!");
    }
}

function todoRedisplay(pending)
{
    if (pending == true)
    {
        exports.process("todo pending");
    }
    else
    {
        exports.process("todo");
    }
}
