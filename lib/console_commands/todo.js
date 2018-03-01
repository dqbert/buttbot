//constants from index.js
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;

//requires
const path = require('path');
const os = require('os');
const fs = require('fs');

//other constants
const todo_file = path.resolve(BOT_PATH, 'todo.txt');

exports.description = "Todo [add, delete, top, next, pending, approve, deny, move, reorder] [position, amount/new position]";

exports.process = function(data) {
    //split up command name into argv
    var argv = data.split(" ");

    try {
        //get each line individually
        var lines = fs.readFileSync(todo_file).toString().split(os.EOL);
        var pending_lines = [];
        lines.forEach((line, key) => {
            if (line.trim() == "") {
                lines.splice(key, 1);
            }

            //find lines which are not approved
            if (line.split("[pending]")[1] != null) {
                //remove unapproved line from todo array
                lines.splice(key, 1);
                //add into pending array
                pending_lines.push(line.split("[pending]")[1]);
            }
        });

        //user wants to list entire file
        if (typeof(argv[1]) == "string") {
            argv[1] = argv[1].toLowerCase();
        }
        if (argv[1] == "all" || argv[1] == "" || argv[1] == null) {

            lines.forEach((line, key) => {
                if (line.trim() == "") return;
                key = key + 1;
                logging.log("[" + key + "] " + line);
            });

        }
        else if (argv[1] == "delete" || argv[1] == "remove") {
            if (argv[2] == null || argv[2] == "") throw new Error("You must specify a valid line to delete!");

            //check if the line is within the file
            if (!(parseInt(argv[2]) - 1 in lines)) {
                throw new Error("You must specify a valid line to delete!");
            }

            //line exists, delete it
            lines.splice(parseInt(argv[2]) - 1, 1);

            //overwrite in file
            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

            logging.log("Deleted line successfully!");
        }
        else if (argv[1] == "add") {
            if (argv[2] == null || argv[2] == "") throw new Error("You must specify a line to add!");

            var position1 = lines.length;
            var position2 = 2;

            if (!isNaN(parseInt(argv[position2]))) {
                position1 = parseInt(argv[position2]) - 1;
                position2 = 3;
            }

            //add line at bottom of array
            lines.splice(position1, 0, argv.slice(position2).join(' '));

            //overwrite in file
            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

            logging.log("Added todo successfully!");
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
                pending_lines.forEach((line, key) => {
                    key++;
                    logging.log("[" + key + "] " + line.split(" ").splice(1));
                });
                return;
            }

            //add pending suggestion to suggestions
            lines.push("[pending] " + argv.slice(2));

            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

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
            lines.push(pending_lines[approve_ndx].trim());

            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

            logging.log("Suggestion approved successfully!");
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
                lines.push("[pending] " + line);
            });

            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

            logging.log("Suggestion denied successfully!");
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

            old_line = lines[origin_ndx];

            lines.splice(new_ndx, 0, old_line);
            lines.splice(origin_ndx + 1, 1);

            fs.writeFileSync(todo_file, lines.join(os.EOL), {flag: 'w'});

            logging.log("List reordered successfully!");

        }
        else {
            throw new Error("Invalid subcommand " + argv[1]);
        }
    }
    catch (err) {
        logging.err(err);
    }

}
