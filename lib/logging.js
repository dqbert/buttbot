//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;

//global includes
const fs = require('fs');
const util = require('util');
const os = require('os');
const pad = require('pad');
const path = require('path');

function getLogfile() {
    var curDate = new Date();
    return path.resolve(BOT_PATH,
        "../logs",
        curDate.getFullYear().toString() + '.' +
        pad(2, (curDate.getMonth() + 1).toString(), '0') + '.' +
        pad(2, curDate.getDate().toString() + ".log", '0'));
}

function retDate() {
    var curDate = new Date();
    return "[" + curDate.toDateString() + " " +
    pad(2, curDate.getHours().toString(), '0') + ":" +
    pad(2, curDate.getMinutes().toString(), '0') + ":" +
    pad(2, curDate.getSeconds().toString(), '0') + "] ";
}

exports.log = function(message) {
    if (message == null) return;
    message = message.toString().trim();
    if (message == "") return;
    //append date to message
    message = retDate() + message;
    console.log.apply(null, arguments);
    message += os.EOL;
    try {
        fs.writeFileSync(getLogfile(), util.format.apply(null,arguments), {flag: "a"});
    }
    catch (err) {
        console.error(retDate() + "logging.js error: " + err.message);
    }
    return;
}

exports.err = function(err) {
    if (typeof(err) === "string") err_string(err);
    if (err instanceof Error) err_error(err);
}

var err_string = function(err) {
    //append date to message
    err = retDate() + err;
    console.log.apply(null, arguments);
    err += os.EOL;
    try {
        fs.writeFileSync(getLogfile(), util.format.apply(null,arguments), {flag: "a"});
    }
    catch (err) {
        err_error(err);
    }
    return;
}

var err_error = function(err) {
    if (err.code == null) err.code = ""
    else err.code += ": ";
    if (err.message == null) err.message = "";
    if (err.stack == null) err.stack = "";
    console.error(retDate() + err.code + err.message);
    console.error(retDate() + err.stack.replace(new RegExp("\\" + os.EOL, 'g'), os.EOL + retDate() + " "));
    try {
        fs.writeFileSync(getLogfile(), retDate() + err.code + ': ' + err.message, {flag: "a"});
        fs.writeFileSync(getLogfile(), retDate() + err.stack.replace(new RegExp("\\" + os.EOL, 'g'), os.EOL + retDate() + " "), {flag: "a"});
    }
    catch (err) {
        console.error(retDate() + "logging.js error: " + err.message);
    }
}
