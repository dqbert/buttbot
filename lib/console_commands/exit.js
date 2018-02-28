//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;

exports.description = "Exits buttbot with return code 0";

exports.process = function(data) {
    logging.log("Now exiting...");
    process.exit(0);
}
