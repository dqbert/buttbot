//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;

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
//guild config utilities
exports.guild.default = {
    "prefix" : "b/",    //prefix of buttbot commands
    "admin_role" : "",  //role which membership is required for to use admin commands
    "guild_name" : ""   //name of the guild
};

//returns the config json of the guild
//adds new keys from default keys if they dont exist
//creates new config if none exists
//returns false on failure
exports.guild.get = async function(guild) {

    assert.ok(guild instanceof discord.Guild);

    var guild_cfg;
    var updated = false;
    var cfg_path = path.resolve(GUILD_PATH, guild.id, 'config.json');

    //try to find config already existing
    try {
        guild_cfg = JSON.parse(await readFile(cfg_path));
    }
    catch (err) {
        //doesn't exist, make new one
        if (err.code === "ENOENT") {
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
    assert.ok(guild instanceof discord.Guild);

    var cfg_path = path.resolve(GUILD_PATH, guild.id);
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
    assert.ok(guild instanceof discord.Guild);

    var guild_dir = path.resolve(GUILD_PATH, guild.id);
    mkdir(guild_dir);
    logging.log("Creating new directory for guild: " + guild.name + "[" + guild.id + "]");

}

exports.admin = {};
//admin config utilities
exports.admin.get = async function(guild, admin_defaults) {
    assert.ok(guild instanceof discord.Guild);

    var guild_cfg;

    //look for already existing admin commands json
    //if we need to edit the JSON to add in new commands, this triggers fs.writefile
    var edited = false;

    try {
        //read existing json
        guild_cfg = JSON.parse(await readFile(path.resolve(GUILD_PATH, guild.id, 'admin_commands.json')));
    }

    catch (err) {

        //doesn't exist, just need to initialize
        if (err.code === 'ENOENT') {
            assert.throws(() => {
                JSON.parse(JSON.stringify(admin_commands));
            });
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
    assert.ok(guild instanceof discord.Guild);

    try {
        writeFile(path.resolve(GUILD_PATH, guild.id, 'admin_commands.json'), JSON.stringify(config), {flag: 'w'});
    }
    catch (err) {
        //doesn't exist, just create
        if (err.code === 'ENOENT') {
            await exports.guild.create_dir(guild);
            writeFile(path.resolve(GUILD_PATH, guild.id, 'admin_commands.json'), JSON.stringify(config), {flag: 'w'});
        }
        //something else went wrong
        else {
            setTimeout(async function() {
                throw err;
            });
        }
    }
}
