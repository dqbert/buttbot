//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
var bot = index.bot;

//global includes
const fs = require('fs');
const os = require('os');
const pad = require('pad');
const path = require('path');
const assert = require('assert');
const discord = require('discord.js');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

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

exports.guild_print = function(guild)
{
    assert.ok(guild instanceof discord.Guild, "Input guild " + guild + " is not a valid guild!");
    return util.format("[%s]: %s", guild.id, guild.name);
}

exports.user_print = function(user) {
    assert.ok(user instanceof discord.User, "Input user " + user + " is not a valid user!");
    return util.format("[%s]: %s", user.id, user.username);
}

exports.log = function(message) {
    assert.equal(typeof message, "string", "Cannot log a non-string message!");

    message = message.toString().trim();
    if (message == "") return;

    //append date to message
    message = retDate() + message;
    console.log.apply(null, arguments);
    message += os.EOL;
    writeFile(getLogfile(), util.format.apply(null,arguments), {flag: "a"});
}

exports.err = function(err) {
    if (typeof(err) === "string") err_string(err);
    else if (err instanceof Error) err_error(err);
    else throw new Error("Argument must be string or Error object!");
}

var err_string = function(err) {
    //append date to message
    err = retDate() + err;
    console.log.apply(null, arguments);
    err += os.EOL;

    try {
        writeFile(getLogfile(), util.format.apply(null,arguments), {flag: "a"});
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
        writeFile(getLogfile(), retDate() + err.code + ': ' + err.message, {flag: "a"});
        writeFile(getLogfile(), retDate() + err.stack.replace(new RegExp("\\" + os.EOL, 'g'), os.EOL + retDate() + " "), {flag: "a"});
    }
    catch (err) {
        console.error(retDate() + "logging.js error: " + err.code + ": " + err.message + os.EOL + err.stack);
    }
}
