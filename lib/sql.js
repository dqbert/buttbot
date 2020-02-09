//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const API_KEY = index.API_KEY;
const config = index.config;
var bot = index.bot;

const os = require('os');
const fs = require('fs');
const path = require('path');
const discord = require('discord.js');
const reload = require('require-reload')(require);
const assert = require('assert');
const mysql = require('mysql');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const SQL_INFO = {
    'host'     : API_KEY.sql_host,
    'port'     : API_KEY.sql_port,
    'user'     : API_KEY.sql_user,
    'password' : API_KEY.sql_pass,
    'charset'  : API_KEY.sql_collation,
    'database' : API_KEY.sql_db
};

exports.sql_connection;
exports.query;

var reconn_message = false; //true if we already said we are reconnecting

var assert_nonnull = function(variable, name) {
    assert.ok(variable !== null && variable !== undefined, `${name} cannot be null!`);
}

var assert_null = function(variable, name) {
    assert.ok(variable === null || variable === undefined, `${name} must be null!`);
}

var reconnect = async function() {
    exports.sql_connection = mysql.createConnection(SQL_INFO);

    var query_func = util.promisify(exports.sql_connection.query).bind(exports.sql_connection);
    exports.query = async function(query, values) {
        try
        {
            var result = await query_func(query, values)
            return result;
        }
        catch (err)
        {
            err.message = `${err.message}${os.EOL}Exception in query: ${os.EOL}${query}${os.EOL}With values:${os.EOL}${values}`;
            throw err;
        }
    }
    var connect = util.promisify(exports.sql_connection.connect).bind(exports.sql_connection);

    try {

        await connect();
        logging.log("New SQL connection created.");
        reconn_message = false;

    }
    catch (err) {
        if (err.code === "ECONNREFUSED") {
            if (!reconn_message) {
                logging.log("Unable to connect. Reconnecting...");
                reconn_message = true
            }
            setTimeout(reconnect, 2000);
        }
        else {
            setTimeout(async function() {
                throw err;
            });
        }
    }

    exports.sql_connection.on('error', (err) => {

        if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNREFUSED") {
            if (!reconn_message) {
                logging.log("SQL connection terminated. Reconnecting...");
                reconn_message = true
            }
            reconnect();
        }
        else {
            setTimeout(async function() {
                throw err;
            });
        }

    });
}

var null_check = function(value, array) {
    assert_nonnull(array, "array");
    assert.ok(Array.isArray(array), "Array arg must be an array!");

    if (value === null || value === undefined || value === "") {
        return "IS NULL ";
    }
    else {
        if (typeof(value) === "string") {
            value = value.toLowerCase();
        }
        array.push(value);
        return "= ? ";
    }
}

reconnect();

exports.channel = {};
exports.channel.add = async function(channel_id, guild_id, role_id, channel_name, channel_istext) {
    assert_nonnull(channel_id, "channel_id");
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "INSERT INTO `buttbot`.`guild_channel` " +
        "(`channel_id`, `guild_id`, `role_id`, `channel_name`, `channel_istext`) " +
        "VALUES(?, ?, ?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE " +
        "`channel_id`=?, `guild_id`=?, `role_id`=?, `channel_name`=?, `channel_istext`=?",
        [channel_id, guild_id, role_id, channel_name, channel_istext, channel_id, guild_id, role_id, channel_name, channel_istext]
    );

    return result;
}

exports.command = {};
exports.command.get_id = async function(command_name) {
    assert_nonnull(command_name, "command_name");
    var result = await exports.query(
        "SELECT `command_id` " +
        "FROM `buttbot`.`command` " +
        "WHERE `command_name` = ?",
        [command_name]
    );

    if (result.length > 0 && result[0].hasOwnProperty("command_id")) {

        return result[0].command_id;

    }
    else {
        return [];
    }
}

exports.command.find_name = async function(guild_id, full_text) {

    var commands = await exports.query(
        "SELECT `command_name` " +
        "FROM `buttbot`.`command`"
    );

    var prefix = await exports.guild.get_prefix(guild_id);

    if (prefix == null || prefix == undefined) {
        prefix = "b/";
    }

    full_text = full_text.replace(prefix, '').replace('<@!' + bot.user.id + '> ', '').trim();

    //get command name from our commands
    var command_name;

    commands.forEach((result) => {

        if (result == null || result == undefined || !result.hasOwnProperty("command_name")) {
            return;
        }

        if (new RegExp(`^${result.command_name}`, 'gi').test(full_text)) {
            command_name = result.command_name;
        }
    });

    return command_name;

}

exports.command.update_guild_command = async function(guild_id, command_id) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(command_id, "command_id");

    try {
        var result = await exports.query(
            "INSERT INTO guild_command " +
            "(guild_id, command_id, requires_admin) " +
            "VALUES(?, ?, (" +
            "SELECT command_admin_default " +
            "FROM command " +
            "WHERE command_id = ? " +
            "))",
            [guild_id, command_id, command_id]
        );
    }
    catch (err) {
        if (err.code !== "ER_DUP_ENTRY") {
            throw err;
        }
    }

    return result;
}

//convert command alias to real command
exports.command.get_real = async function(command_name) {
    assert_nonnull(command_name, "command_name");

    var result = await exports.query(
        "SELECT * " +
        "FROM command " +
        "WHERE command_id = ( " +
        "SELECT command_id " +
        "FROM command_alias " +
        "WHERE command_alias_name = ?" +
        ")",
        [command_name]
    );

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }

    return result[0];
}

exports.command.get_all = async function() {
    var result = await exports.query(
        "SELECT * " +
        "FROM command "
    );

    return result;
}

exports.command.get_all_admin = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");
    var result = await exports.query(
        "SELECT c.*, gc.requires_admin " +
        "FROM command c, guild_command gc " +
        "WHERE c.command_id = gc.command_id " +
        "AND gc.guild_id = ?",
        [guild_id]
    );

    return result;
}

exports.command.requires_admin = async function(guild_id, command_name) {
    var result = await exports.query(
        "SELECT gc.requires_admin " +
        "FROM command c, guild_command gc " +
        "WHERE c.command_id = gc.command_id " +
        "AND gc.guild_id = ? " +
        "AND LOWER(c.command_name) = LOWER(?)",
        [guild_id, command_name]
    );

    if (result === null || result === undefined || result.length === 0) {
        throw new Error("Couldn't find command in query result!" + os.EOL + result.toString());
    }

    return result[0].requires_admin;
}

exports.command.save_admin = async function(guild_id, command_name, requires_admin) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(command_name, "command_name");
    assert_nonnull(requires_admin, "requires_admin");

    var result = await exports.query(
        "UPDATE guild_command " +
        "SET requires_admin = ? " +
        "WHERE guild_id = ? " +
        "AND command_id = (" +
        "SELECT gc.command_id " +
        "FROM command c, guild_command gc " +
        "WHERE c.command_id = gc.command_id " +
        "AND LOWER(c.command_name) = LOWER(?)" +
        ")",
        [requires_admin, guild_id, command_name]
    );

    return result;
}

exports.command.get_permissions = async function(command_id) {
    assert_nonnull(command_id, "command_id");

    var result = await exports.query(
        "SELECT command_permission " +
        "FROM command_permissions " +
        "WHERE command_id = ?",
        [command_id]
    );

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }

    result.forEach((entry, index, array) => {
        array[index] = Object.values(entry)[0];
    });

    return result;
}

exports.command.sync = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var quer = "INSERT IGNORE INTO guild_command " +
        "(guild_command.command_id, guild_command.requires_admin, guild_command.guild_id) " +
        "SELECT command.command_id, command.command_admin_default, ? " +
        "FROM command"
    var quer_a = [guild_id]

    var result = [];

    try {
        result = await exports.query(
            quer,
            quer_a
        );
    }
    catch (err) {
        logging.err(err);
        logging.err(`Attempted query: ${os.EOL}${quer}`);
        logging.err(`With values: ${os.EOL}${quer_a}`);
    }

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }

    return result;
}

exports.keyword = {};
exports.keyword.add = async function(guild_id, user_id, keyword, keyword_type, keyword_text, command_id) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(user_id, "user_id");
    assert_nonnull(keyword, "keyword");
    assert_nonnull(keyword_type, "keyword_type");

    if (keyword_type === "command") {
        assert_nonnull(command_id, "command_id");
    }
    else {
        assert_null(command_id, "command_id");
    }

    var values = [guild_id, keyword.toLowerCase(), keyword_type];

    var existence = await exports.query(
        "SELECT keyword_id " +
        "FROM guild_keyword " +
        "WHERE guild_id = ? "+
        "AND LOWER(keyword) = ? " +
        "AND keyword_type = ? " +
        "AND user_id " + null_check(user_id, values) +
        "AND LOWER(keyword_text) " + null_check(keyword_text, values) +
        "AND command_id " + null_check(command_id, values),
        values
    );

    if (existence.length > 0) {
        var err = new Error("Duplicate keyword exists!");
        err.code = "EDUPKEYW";
        throw err;
    }

    var result = await exports.query(
        "INSERT INTO `guild_keyword` " +
        "(`guild_id`, `user_id`, `keyword`,`keyword_type`,`keyword_text`,`command_id`) " +
        "VALUES(?, ?, ?, ?, ?, ?) ",
        [guild_id, user_id, keyword, keyword_type, keyword_text, command_id]
    );

    return result;

}

exports.keyword.get = {};
exports.keyword.get.by_message = async function(message) {

    assert.ok(message instanceof discord.Message, "Cannot get keyword from a non-Discord.js message!");

    var guild_id = config.guild.fromChannel(message.channel).id;
    var result = await exports.keyword.get.by_guild(guild_id);
    return result.filter((keyword) => {
        return (new RegExp(keyword.keyword, 'gi').test(message.content));
    });

}

exports.keyword.get.keyword_types = async function() {

    var result = await exports.query(
        "SHOW COLUMNS FROM guild_keyword LIKE 'keyword_type'"
    );

    if (result.length === 0) {
        throw new Error("No keyword types found!");
    }

    return result[0].Type.split("'").filter((r_enum) => {
        return (!new RegExp("(?:,|\\(|\\))", "gi").test(r_enum));
    });
}

exports.keyword.get.by_guild = async function(guild_id, keyword, exact) {
    assert_nonnull(guild_id, "guild_id");
    var extra_check = ""
    var values = [guild_id];

    if (exact === null || exact === undefined) {
        exact = false;
    }

    if (keyword !== null && keyword !== undefined && keyword !== "") {
        extra_check = "AND LOWER(keyword) LIKE ?"
        if (!exact) {
            keyword = `%${keyword}%`;
        }
        values.push(keyword);
    }

    var result = await exports.query(
        "SELECT * " +
        "FROM guild_keyword " +
        "WHERE guild_id = ? " +
        extra_check,
        values
    );

    return result;
}

exports.keyword.remove = async function(guild_id, keyword) {
    assert_nonnull(keyword, "keyword");
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "DELETE FROM guild_keyword " +
        "WHERE LOWER(keyword) = ? " +
        "AND guild_id = ?",
        [keyword.toLowerCase().trim(), guild_id]
    );

    return result;
}

exports.guild = {};
exports.guild.get_prefix = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "SELECT `guild_prefix` " +
        "FROM `buttbot`.`guild` " +
        "WHERE `guild_id`=?",
        [guild_id]
    );

    if (result.length > 0 && result[0].hasOwnProperty("guild_prefix")) {

        return result[0].guild_prefix;

    }
    else {
        return [];
    }
}

exports.guild.save_prefix = async function(guild_id, prefix) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(prefix, "prefix");

    var result = await exports.query(
        "UPDATE guild " +
        "SET guild_prefix = ? " +
        "WHERE guild_id = ? ",
        [prefix, guild_id]
    );

    return result;
}

exports.guild.add = async function(guild_id, guild_real, guild_name) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(guild_real, "guild_real");

    var columns = "(`guild_id`, `guild_real`";
    var values = "VALUES(?, ?";
    var values2 = "`guild_id` = ?, `guild_real` = ?";
    var values_array = [guild_id, guild_real];

    if (guild_name !== null && guild_name !== undefined) {
        columns = columns + ", `guild_name`";
        values = values + ", ?";
        values2 = values2 + ", `guild_name` = ?";
        values_array.push(guild_name);
    }

    columns = columns + ") ";
    values = values + ") ";
    values_array = values_array.concat(values_array);

    quer = "INSERT INTO `buttbot`.`guild` " +
        columns +
        values +
        "ON DUPLICATE KEY UPDATE " +
        values2,
        values_array;

    var result = [];

    try {
        result = await exports.query(
            "INSERT INTO `buttbot`.`guild` " +
            columns +
            values +
            "ON DUPLICATE KEY UPDATE " +
            values2,
            values_array
        );
    }
    catch (err) {
        logging.err(err);
        logging.err(`Attempted query: ${os.EOL}${quer}`);
        logging.err(`With values: ${os.EOL}${values_array}`);
    }

    return result;
}

exports.guild.get = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "SELECT * " +
        "FROM guild " +
        "WHERE guild_id = ?",
        [guild_id]
    );

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }

    return result;
}

//returns true if all commands registered
//returns false otherwise
exports.guild.compare_commands = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var quer;
    var array = [];
    var result1 = null;
    var result2 = null;

    try {
        quer = "SELECT COUNT(*) as \"count\" " +
            "FROM guild_command " +
            "WHERE guild_id = ?";
        array = [guild_id]
        var result1 = await exports.query(
            quer,
            array
        );

        quer = "SELECT COUNT(*) as \"count\" " +
            "FROM command";
        array = [];

        var result2 = await exports.query(
            quer
        );
    }
    catch (err) {
        logging.err(err);
        logging.err(`Attempted query: ${os.EOL}${quer}`);
        logging.err(`With array: ${os.EOL}${quer}`);
    }

    if (result1 === null || result1 === undefined || result1.length === 0 ||
        result2 === null || result2 === undefined || result2.length === 0) {
        return false;
    }

    if (result1[0].count !== result2[0].count) {
        return false;
    }

    return true;

}

exports.roles = {};
exports.roles.get = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "SELECT * " +
        "FROM guild_role " +
        "WHERE guild_id = ?",
        [guild_id]
    );

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }
    else {
        return result;
    }
}

exports.roles.add = async function(role_id, guild_id, user_id, role_name, role_date) {
    assert_nonnull(role_id, "role_id");
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(role_name, "role_name");

    var result = [];

    result[0] = await exports.query(
        "INSERT INTO guild_role " +
        "(role_id, guild_id, role_name, user_id) " +
        "VALUES(?, ?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE " +
        "role_id = ?, guild_id = ?, role_name = ?, user_id = ?",
        [role_id, guild_id, role_name, user_id, role_id, guild_id, role_name, user_id]
    );

    if (role_date instanceof Date) {
        result[1] = await exports.query(
            "UPDATE guild_role " +
            "SET role_date = ? " +
            "WHERE role_id = ?",
            [role_date, role_id]
        );
    }
    else {
        result[1] = null;
    }

    return result;

}

exports.roles.remove = async function(role_id, guild_id) {
    assert_nonnull(role_id, "role_id");
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "DELETE FROM guild_role " +
        "WHERE role_id = ? " +
        "AND guild_id = ?",
        [role_id, guild_id]
    );

    return result;
}

exports.roles.admin = {};
exports.roles.admin.get = async function(guild_id) {
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "SELECT guild_admin_role " +
        "FROM guild " +
        "WHERE guild_id = ? ",
        [guild_id]
    );

    if (result === null || result === undefined || result.length === 0) {
        return [];
    }

    return result[0].guild_admin_role;
}

exports.roles.admin.save = async function(guild_id, role_id) {
    assert_nonnull(guild_id, "guild_id");

    var result = await exports.query(
        "UPDATE guild " +
        "SET guild_admin_role = ? " +
        "WHERE guild_id = ? ",
        [role_id, guild_id]
    );

    return result;
}

exports.usage = {};
exports.usage.add = async function(command_id, guild_id, user_id, message, usage_text, usage_date, reply_to, channel_id) {
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(user_id, "user_id");
    assert_nonnull(message, "message");
    assert_nonnull(usage_text, "usage_text");
    var columns = "(`guild_id`, `user_id`, `message_id`, `usage_text`";
    var values = "VALUES(?, ?, ?, ?";
    var values_array = [guild_id, user_id, message.id, usage_text];

    if (usage_date !== null && usage_date !== undefined) {
        columns = columns + ", `usage_date`";
        values = values + ", ?";
        values_array.push(usage_date);
    }

    //first pass - check if the reply to has been defined in the table
    if (reply_to !== null && reply_to !== undefined) {
        reply_to = await exports.usage.find(reply_to);
    }

    //second pass - use our found id to associate usage
    if (reply_to !== null && reply_to !== undefined) {
        columns = columns + ", `usage_reply_id`";
        values = values + ", ?";
        values_array.push(reply_to);
    }

    if (command_id !== null && command_id !== undefined) {
        columns = columns + ", `command_id`";
        values = values + ", ?";
        values_array.push(command_id);
    }

    if (channel_id !== null && channel_id !== undefined) {
        columns = columns + ", `channel_id`";
        values = values + ", ?";
        values_array.push(channel_id);
    }

    columns = columns + ") ";
    values = values + ") ";

    var result = await exports.query(
        "INSERT INTO `buttbot`.`guild_usage` " +
        columns +
        values,
        values_array
    );

    return result;

}

exports.usage.find = async function(reply_to) {
    var result = await exports.query(
        "SELECT `usage_id` " +
        "FROM `buttbot`.`guild_usage` " +
        "WHERE `message_id` = ?",
        reply_to.id
    );

    if (result.length > 0 && result[0].hasOwnProperty("usage_id")) {

        return result[0].usage_id;

    }
    else {
        return null;
    }
}

exports.user = {}
exports.user.add = async function(user_id, guild_id, user_name) {
    assert_nonnull(user_id, "user_id");
    assert_nonnull(guild_id, "guild_id");
    assert_nonnull(user_name, "user_name");

    var result = await exports.query(
        "INSERT INTO `buttbot`.`user` " +
        "(`user_id`, `guild_id`, `user_name`) " +
        "VALUES(?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE " +
        "`user_id` = ?, `guild_id` = ?, `user_name` = ?",
        [user_id, guild_id, user_name, user_id, guild_id, user_name]
    );

    return result;
}

exports.todo = {};
exports.todo.get = async function(todo_text, guild_id, user_id, top_amount, pending) {

    var quer, result;
    var conditions = [];
    var values_array = [];
    var limit = "";

    if (todo_text !== null && todo_text !== undefined && todo_text.length !== 0) {
        conditions.push("todo_text like ?");
        values_array.push("%" + todo_text + "%");
    }

    if (guild_id !== null && guild_id !== undefined) {
        conditions.push("guild_id = ?");
        values_array.push(guild_id);
    }

    if (user_id !== null && user_id !== undefined) {
        conditions.push("user_id = ?");
        values_array.push(user_id);
    }

    conditions.push("todo_pending = ?");
    if (pending == true)
    {
        values_array.push(true);
    }
    else
    {
        values_array.push(false);
    }

    if (top_amount !== null && top_amount !== undefined && top_amount !== 0)
    {
        limit = " LIMIT ?";
        values_array.push(top_amount);
    }

    quer = "SELECT todo_text " +
           "FROM todo";

    if (conditions.length > 0) {
        quer = quer + " WHERE " + conditions.join(" AND ");
    }
    quer = quer + " ORDER BY todo_id";
    quer = quer + limit;

    result = await exports.query(quer, values_array);

    if (result === null || result === undefined || result.length === 0) {
        result = [];
    }

    return result;
}

exports.todo.swap = async function(index1, index2, todo_pending) {
    assert_nonnull(index1, "index1");
    assert_nonnull(index2, "index2");
    index1 = parseInt(index1) - 1;
    index2 = parseInt(index2) - 1;

    values1 = ["todo_pending = ?"];
    values2 = [];

    if (todo_pending === true)
    {
        values2.push(true);
    }
    else
    {
        values2.push(false);
    }

    var ret1 = await exports.query(
        "SELECT todo_id, todo_text " +
        "FROM todo " +
        "WHERE " + values1.join(" AND ") +
        " LIMIT ?,1",
        values2.concat(index1)
    );

    var ret2 = await exports.query(
        "SELECT todo_id, todo_text " +
        "FROM todo " +
        "WHERE " + values1.join(" AND ") +
        " LIMIT ?,1",
        values2.concat(index2)
    );

    if (ret1 === null || ret1 === undefined || ret1.length === 0 ||
        ret2 === null || ret2 === undefined || ret2.length === 0) {
        return null;
    }

    id1 = ret1[0].todo_id;
    id2 = ret2[0].todo_id;
    text1 = ret1[0].todo_text;
    text2 = ret2[0].todo_text;

    var result = await exports.query(
        "UPDATE todo " +
        "SET todo_text = ? " +
        "WHERE todo_id = ?",
        [text2, id1]
    )

    var result = await exports.query(
        "UPDATE todo " +
        "SET todo_text = ? " +
        "WHERE todo_id = ?",
        [text1, id2]
    )

    return result;
}

exports.todo.add = async function(text, pending, user_id, guild_id)
{
    var quer, result;
    var values = [];
    var values2 = [];
    var values_array = [];

    assert_nonnull(text, "text");
    values_array.push(text);
    values.push("todo_text");
    values2.push("?");

    if (pending !== null && pending !== undefined)
    {
        values_array.push(pending);
        values.push("todo_pending");
        values2.push("?");
    }

    if (user_id !== null && user_id !== undefined)
    {
        values_array.push(user_id);
        values.push("user_id");
        values2.push("?");
    }

    if (guild_id !== null && guild_id !== undefined)
    {
        values_array.push(guild_id);
        values.push("guild_id");
        values2.push("?");
    }

    quer = "INSERT INTO todo " +
           "(" + values.join(", ") + ") " +
           "VALUES (" + values2.join(", ") + ")";

    result = await exports.query(quer, values_array);

    if (result === null || result === undefined || result.length === 0)
    {
        return [];
    }

    return result;

}

exports.todo.delete = async function(todo_index, todo_pending)
{
    var quer, result, condition;
    var conditions = [];
    var values_array = [];

    assert_nonnull(todo_index, "todo_index")
    todo_index = parseInt(todo_index) - 1;

    conditions.push("todo_pending = ?");
    if (todo_pending === true)
    {
        values_array.push(true);
    }
    else
    {
        values_array.push(false);
    }
    values_array.push(todo_index);

    quer = "SELECT todo_id " +
           "FROM todo " +
           "WHERE " + conditions.join(" AND ") +
           " LIMIT ?,1";

    result = await exports.query(quer, values_array);

    if (result === null || result === undefined || result.length === 0)
    {
        return result;
    }

    conditions = [];
    values_array = [];

    conditions.push("todo_id = ?");
    values_array.push(result[0].todo_id);

    quer = "DELETE FROM todo " +
           "WHERE " + conditions.join(" AND ") +
           " LIMIT 1";

    result = await exports.query(quer, values_array);

    return result;
}

exports.todo.approve = async function(todo_index)
{
    var quer, result, condition, value;
    var values_array = [];

    assert_nonnull(todo_index, "todo_index");
    todo_index = parseInt(todo_index) - 1;
    values_array.push(todo_index);

    quer = "SELECT todo_id " +
           "FROM todo " +
           "WHERE todo_pending = true"
           " LIMIT ?,1";

    result = await exports.query(quer, values_array);

    if (result === null || result === undefined || result.length === 0)
    {
        return result;
    }

    values_array = [result[0].todo_id];

    quer = "UPDATE todo " +
           "SET todo_pending = false " +
           "WHERE todo_pending = true " +
           "AND todo_id = ? "
           "LIMIT 1";

    result = await exports.query(quer, values_array);

    return result;
}
