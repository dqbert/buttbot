//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;

//promisify fs functions for async/await
const fs = require('fs');
const util = require('util');
const assert = require('assert');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

exports.description = "Exits buttbot with return code 0";
exports.aliases = ["quit"];

exports.process = async function(data) {
    logging.log("Now exiting...");
    process.exit(0);
}
