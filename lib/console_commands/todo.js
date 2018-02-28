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

exports.description = "Todo [add,delete,top,next] [position,amount]";

exports.process = function(data) {
    //split up command name into argv
    var argv = data.split(" ");

    try {
        //get each line individually
        var lines = fs.readFileSync(todo_file).toString().split(os.EOL);
        lines.forEach((line, key) => {
            if (line.trim() == "") {
                lines.splice(key, 1);
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
        else if (argv[1] == "delete") {
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
                throw new Error("Invalid parameter " + argv[2] + ": must be a valid integer!");
            }
            else {
                //log all of the lines asked for
                lines.splice(0, parseInt(argv[2])).forEach((line, key) => {
                    key++;
                    logging.log("[" + key + "] " + line);
                });
            }
        }
        else {
            throw new Error("Invalid subcommand " + argv[1]);
        }
    }
    catch (err) {
        logging.err(err);
    }

}
