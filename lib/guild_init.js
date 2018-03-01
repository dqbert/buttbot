//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;

//default guild config
exports.guild_default = {
    "prefix" : "b/",
    "admin_role" : ""
}


//function to expose default guild config
exports.start_guild = function() {
    var new_cfg = exports.guild_default;
    return new_cfg;
}
