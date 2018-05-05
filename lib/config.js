//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
var bot = index.bot;

const os = require('os');
const fs = require('fs');
const path = require('path');
const discord = require('discord.js');
const reload = require('require-reload')(require);
const assert = require('assert');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

exports.guild = {};

exports.guild.fromChannel = function(guild) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input " + guild + " is not a valid discord guild or channel!");

    if (guild instanceof discord.Channel) {
        if (guild.guild == null) {
            return guild;
        }
        else {
            return guild.guild;
        }
    }
    else {
        return guild;
    }
}

exports.guild.cfg_path = function(guild) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input " + guild + " is not a valid discord guild or channel!");

    //check if there is a guild for this channel
    guild = exports.guild.fromChannel(guild);

    if (guild instanceof discord.Channel) {
        return "c" + guild.id;
    }
    else {
        return guild.id;
    }
}

//guild config utilities
exports.guild.default = {
    "prefix" : "b/",    //prefix of buttbot commands
    "admin_role" : "",  //role which membership is required for to use admin commands
    "guild_name" : "",  //name of the guild
    "usage" : "0"         //number of commands used in this channel
};

//returns the config json of the guild
//adds new keys from default keys if they dont exist
//creates new config if none exists
//returns false on failure
exports.guild.get = async function(guild) {

    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input  " + guild + " is not a valid channel or guild!");

    guild = exports.guild.fromChannel(guild);

    var guild_cfg;
    var updated = false;
    //append "c" to channel configs (non-guilds)
    var cfg_path = path.resolve(GUILD_PATH, exports.guild.cfg_path(guild), 'config.json');

    //try to find config already existing
    try {
        guild_cfg = JSON.parse(await readFile(cfg_path));
    }
    catch (err) {
        //doesn't exist, make new one
        if (err.code === "ENOENT" || err.message === "Unexpected end of JSON input") {
            //create the directory just in case
            await exports.guild.create_dir(guild);
            guild_cfg = exports.guild.default;
            updated = true;
        }

        //something else went wrong
        else {
            setTimeout(async function() {
                throw err;
            });
        }
    }

    //check if any keys dont yet exist in our config
    if (!updated) {
        for (var key in exports.guild.default) {
            //create key if not found
            if (!guild_cfg.hasOwnProperty(key)) {
                updated = true;

                //add the guild name to this JSON object for debugging
                if (key == "guild_name") {
                    guild_cfg[key] = guild.name;
                }

                //add the default key value for this key
                else {
                    guild_cfg[key] = exports.guild.default[key];
                }

            }
        }
    }

    //resave the file if the config was updated
    if (updated) {
        await exports.guild.save(guild_cfg, guild);
    }

    return guild_cfg;

}

//saves the config for a guild
//returns true on success, false on failure
exports.guild.save = async function(config, guild) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input  " + guild + " is not a valid channel or guild!");

    guild = exports.guild.fromChannel(guild);

    var cfg_path = path.resolve(GUILD_PATH, exports.guild.cfg_path(guild));
    try {
        writeFile(path.resolve(cfg_path, 'config.json'), JSON.stringify(config), {flag: 'w'});
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            await exports.guild.create_dir(guild);
            writeFile(path.resolve(cfg_path, 'config.json'), JSON.stringify(config), {flag: 'w'});
        }
        else {
            setTimeout(async function() {
                throw err;
            });
        }
    }
}

//initialize config directory for guild
exports.guild.create_dir = async function(guild) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input  " + guild + " is not a valid channel or guild!");

    guild = exports.guild.fromChannel(guild);

    var guild_dir = path.resolve(GUILD_PATH, exports.guild.cfg_path(guild));
    mkdir(guild_dir);
    logging.log("Creating new directory for guild: " + logging.guild_print(guild));

}

exports.admin = {};
//admin config utilities
exports.admin.get = async function(guild, admin_defaults) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input  " + guild + " is not a valid channel or guild!");

    guild = exports.guild.fromChannel(guild);

    var guild_cfg;

    //look for already existing admin commands json
    //if we need to edit the JSON to add in new commands, this triggers fs.writefile
    var edited = false;

    try {
        //read existing json
        guild_cfg = JSON.parse(await readFile(path.resolve(GUILD_PATH, exports.guild.cfg_path(guild), 'admin_commands.json')));
    }

    catch (err) {

        //doesn't exist, just need to initialize
        if (err.code === 'ENOENT') {
            assert.ok(admin_defaults != null, "Admin defaults not specified!");
            assert.ok(admin_defaults._valid === true, "Admin defaults not properly specified!");
            delete admin_defaults._valid; //don't need this key anymore
            guild_cfg = admin_defaults;
            edited = true;
        }
        //something else went wrong, just rethrow
        else {
            setTimeout(async function() {
                throw err;
            });
        }

    }

    //read through each key in defaults looking for values not in admin_json
    if (admin_defaults != null) {
        for (var key in admin_defaults) {

            if (!admin_defaults.hasOwnProperty(key)) continue;

            //find default key within guild json
            var found = false;
            for (var key2 in guild_cfg) {
                if (!admin_defaults.hasOwnProperty(key2)) continue;

                if (key == key2) {
                    found = true;
                    break;
                }
            }

            //key not found, add it to this json
            if (!found) {
                guild_cfg[key] = admin_defaults[key];
                edited = true; //mark that we need to write to file now
            }

        }
    }

    //now write to file if we need to
    if (edited) {
        exports.admin.save(guild_cfg, guild);
    }

    return guild_cfg;
}

exports.admin.save = async function(config, guild) {
    assert.ok(guild instanceof discord.Channel || guild instanceof discord.Guild, "Input  " + guild + " is not a valid channel or guild!");
    guild = exports.guild.fromChannel(guild);

    try {
        writeFile(path.resolve(GUILD_PATH, exports.guild.cfg_path(guild), 'admin_commands.json'), JSON.stringify(config), {flag: 'w'});
    }
    catch (err) {
        //doesn't exist, just create
        if (err.code === 'ENOENT') {
            await exports.guild.create_dir(guild);
            writeFile(path.resolve(GUILD_PATH, exports.guild.cfg_path(guild), 'admin_commands.json'), JSON.stringify(config), {flag: 'w'});
        }
        //something else went wrong
        else {
            setTimeout(async function() {
                throw err;
            });
        }
    }
}
