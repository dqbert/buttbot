require("module-alias/register");
require('source-map-support').install(); // For proper .ts file error line mapping
import * as mysql from "mysql";
import * as util from "util";
import * as discord from "discord.js";
import * as mongodb from "mongodb";
import { KeywordTypesEnum, Keyword } from "@entities/Keyword";
import { Guild } from "@entities/Guild";
import { User } from "@entities/User";
import { Role } from "@entities/Role";
import { Channel } from "@entities/Channel";
import { GuildCommand } from "@entities/GuildCommand";
import { Todo } from "@entities/Todo";
import { Usage } from "@entities/Usage";
import * as constants from "@lib/constants";
import * as MongoInterface from "@lib/MongoInterface";
import * as typegoose from "@typegoose/typegoose";

let keywordMap:
{
    [key: string]: KeywordTypesEnum | undefined
} =
{
    "keep": KeywordTypesEnum.KEEP,
    "delete": KeywordTypesEnum.DELETE,
    "edit": KeywordTypesEnum.EDIT,
    "notify": KeywordTypesEnum.NOTIFY/*,
    "command": KeywordTypesEnum.COMMAND*/
}

interface IOldGuild
{
    guild_id: discord.Snowflake;
    guild_real: boolean;
    guild_prefix: string;
    guild_name: string;
}

interface IOldGuildChannel
{
    channel_id: discord.Snowflake;
    guild_id: discord.Snowflake;
    role_id: discord.Snowflake;
    channel_name: string;
    channel_istext: boolean;
}

interface IOldGuildCommand
{
    command_id: number;
    guild_id: discord.Snowflake;
    requires_admin: boolean;
}

interface IOldGuildKeyword
{
    keyword_id: number;
    guild_id: discord.Snowflake;
    user_id: discord.Snowflake;
    keyword: string;
    keyword_type: string;
    keyword_text: string;
    command_id: number;
}

interface IOldGuildRole
{
    role_id: discord.Snowflake;
    guild_id: discord.Snowflake;
    user_id: discord.Snowflake;
    role_name: string;
    role_date: Date;
}

interface IOldGuildUsage
{
    usage_id: number;
    guild_id: discord.Snowflake;
    user_id: discord.Snowflake;
    message_id: discord.Snowflake;
    command_id: number;
    channel_id: discord.Snowflake;
    usage_text: string;
    usage_date: Date;
    usage_reply_id: number;
}

interface IOldTodo
{
    todo_id: number;
    user_id: discord.Snowflake;
    guild_id: discord.Snowflake;
    todo_text: string;
    todo_pending: boolean;
    todo_issue_url: string;
}

interface IOldUser
{
    user_id: discord.Snowflake;
    guild_id: discord.Snowflake;
    user_name: string;
}

interface IOldCommand
{
    command_id: number;
    command_parent: number;
    command_name: string;
    command_path: string;
    command_description: string;
    command_admin_default: boolean;
}

declare global
{
    interface Array<T>
    {
        findObject(value: any, key: keyof T): T;
    }
}

Array.prototype.findObject = function<T>(value: any, key: keyof T): T
{
    let foundObject = this.find(object => object[key] == value);
    if (foundObject == null)
    {
        throw new ObjectNullError(`Found object was null for field: ${value} of type: ${key}`);
    }
    return foundObject;
}

const SQL_INFO: mysql.ConnectionConfig =
{
    'host'     : constants.API_KEY.sql_host,
    'port'     : constants.API_KEY.sql_port,
    'user'     : constants.API_KEY.sql_user,
    'password' : constants.API_KEY.sql_pass,
    'charset'  : constants.API_KEY.sql_collation,
    'database' : constants.API_KEY.sql_db
}

class ObjectNullError extends Error
{
    constructor(message: string)
    {
        super(message);

        Object.setPrototypeOf(this, ObjectNullError.prototype);
    }
}

const connection = mysql.createConnection(SQL_INFO);
const query: (queryString: string, queryValues?: Array<any>) => Promise<any> = util.promisify(connection.query).bind(connection);
async function main()
{
    await util.promisify(connection.connect).bind(connection)();
    await MongoInterface.connection.awaitConnected();
    console.log("connected");

    // Objects corresponding with old tables:
    // Guild: guild
    let oldGuilds: Array<IOldGuild> = await query("SELECT * FROM guild");
    let newGuilds: Map<discord.Snowflake, Guild> = new Map();
    console.log("creating new guilds");
    oldGuilds.forEach((guild) =>
    {
        let newGuild = new Guild();
        newGuild.id = guild.guild_id;
        newGuild.name = guild.guild_name;
        newGuild.prefix = guild.guild_prefix;
        newGuilds.set(newGuild.id, newGuild);
    });

    // User: user
    let oldUsers: Array<IOldUser> = await query("SELECT * FROM user");
    console.log("creating new users");
    oldUsers.forEach((user) =>
    {
        let newUser = new User();
        newUser.id = user.user_id;
        newUser.name = user.user_name;
        newGuilds.get(user.guild_id)!.addUser(newUser);
    });

    // Role: guild_role
    let oldRoles: Array<IOldGuildRole> = await query("SELECT * FROM guild_role");
    console.log("creating new roles");
    oldRoles.forEach((role) =>
    {
        let newRole = new Role();
        newRole.createdDate = role.role_date;
        newRole.id = role.role_id;
        newRole.name = role.role_name;
        newRole.userID = role.user_id;
        newGuilds.get(role.guild_id)!.addRole(newRole);
    });

    // GuildChannel: guild_channel
    let oldGuildChannels: Array<IOldGuildChannel> = await query("SELECT * FROM guild_channel");
    console.log("creating new guild channels");
    oldGuildChannels.forEach((guildChannel) =>
    {
        let newGuildChannel = new Channel();
        newGuildChannel.id = guildChannel.channel_id;
        newGuildChannel.isTextChannel = guildChannel.channel_istext;
        newGuildChannel.name = guildChannel.channel_name;
        newGuildChannel.roleID = guildChannel.role_id;
        newGuilds.get(guildChannel.guild_id)!.addChannel(newGuildChannel);
    });

    // command: Only used for reference
    let oldCommands: Array<IOldCommand> = await query("SELECT * FROM command");

    // GuildCommand: guild_command
    let oldGuildCommands: Array<IOldGuildCommand> = await query("SELECT * FROM guild_command");
    console.log("creating new guild commands");
    oldGuildCommands.forEach((guildCommand) =>
    {
        let newGuildCommand = new GuildCommand();
        newGuildCommand.name = oldCommands.findObject(guildCommand.command_id, "command_id").command_name;
        newGuildCommand.requiresAdmin = guildCommand.requires_admin;
        newGuilds.get(guildCommand.guild_id)!.addCommand(newGuildCommand);
    });

    // Keyword: guild_keyword
    let oldGuildKeywords: Array<IOldGuildKeyword> = await query("SELECT * FROM guild_keyword");
    let newGuildKeywords: Array<Keyword> = [];
    console.log("creating new guild keywords");
    oldGuildKeywords.forEach((guildKeyword) =>
    {
        let newGuildKeyword = new Keyword();
        try
        {
            newGuildKeyword.commandName = oldCommands.findObject(guildKeyword.command_id, "command_id").command_name;
        }
        catch (error)
        {
            if (error instanceof ObjectNullError)
            {
                newGuildKeyword.commandName = undefined;
            }
            else
            {
                throw error;
            }
        }
        newGuildKeyword.name = guildKeyword.keyword;
        newGuildKeyword.text = guildKeyword.keyword_text;
        newGuildKeyword.type = keywordMap[guildKeyword.keyword_type];
        if (!newGuildKeyword.type)
        {
            console.log(newGuildKeyword, guildKeyword);
            throw new Error(`Invalid type on keyword`);
        }
        newGuildKeyword.userID = guildKeyword.user_id;
        newGuildKeyword.guildID = guildKeyword.guild_id;
        newGuildKeywords.push(newGuildKeyword);
    });

    // Todo: todo
    let oldTodos: Array<IOldTodo> = await query("SELECT * FROM todo");
    let newTodos: Array<Todo> = [];
    console.log("creating new todos");
    oldTodos.forEach((oldTodo) =>
    {
        let newTodo = new Todo();
        newTodo.guild = newGuilds.get(oldTodo.guild_id);
        newTodo.issueURL = oldTodo.todo_issue_url;
        newTodo.pending = oldTodo.todo_pending;
        newTodo.text = oldTodo.todo_text;
        newTodo.user = newTodo.guild?.users.get(oldTodo.user_id);
        newTodos.push(newTodo);
    });

    // Usage: guild_usage
    let oldGuildUsages: Array<IOldGuildUsage> = await query("SELECT * FROM guild_usage");
    type guildUsageWrapper =
    {
        tempID: number,
        tempReplyID: number,
        guildUsage: Usage
    }
    let wrappers: Map<discord.Snowflake, guildUsageWrapper[]> = new Map();
    console.log(`creating new usages ${oldGuildUsages.length}`);
    oldGuildUsages.forEach((oldGuildUsage) =>
    {
        let newGuildUsage = new Usage();
        newGuildUsage._id = new mongodb.ObjectId();
        newGuildUsage.channelID = oldGuildUsage.channel_id;
        newGuildUsage.date = oldGuildUsage.usage_date;
        newGuildUsage.messageID = oldGuildUsage.message_id;
        newGuildUsage.text = oldGuildUsage.usage_text;
        newGuildUsage.userID = oldGuildUsage.user_id;
        if (newGuildUsage.text)
        {
            if (!wrappers.get(oldGuildUsage.guild_id))
            {
                wrappers.set(oldGuildUsage.guild_id, []);
            }
            let wrapper: guildUsageWrapper =
            {
                tempID: oldGuildUsage.usage_id,
                tempReplyID: oldGuildUsage.usage_reply_id,
                guildUsage: newGuildUsage
            }
            wrappers.get(oldGuildUsage.guild_id)!.push(wrapper);
        }
        else
        {
            console.log(`Invalid text for new guild usage`, newGuildUsage, oldGuildUsage);
        }
    });

    console.log(`Setting usage reply IDs`);
    newGuilds.forEach((guild) =>
    {
        wrappers.get(guild.id ?? "")?.forEach(usage =>
        {
            let doPush = true;
            if (usage.tempReplyID)
            {
                let replyUsage = wrappers.get(guild.id ?? "")?.find(findUsage => {
                    return(findUsage.tempID == usage.tempReplyID);
                });

                if (replyUsage)
                {
                    usage.guildUsage.replyTo = replyUsage.guildUsage._id;
                }
                else
                {
                    console.log(`No reply for usage`, usage);
                    doPush = false;
                }
            }
            if (doPush)
            {
                guild.usages.push(usage.guildUsage);
            }
        });
    });

    console.log(`adding ${newGuilds.size} guilds`);
    await typegoose.getModelForClass(Guild).insertMany(Array.from(newGuilds.values()));

    console.log(`adding ${newGuildKeywords.length} keywords`);
    await typegoose.getModelForClass(Keyword).insertMany(newGuildKeywords);

    console.log(`adding ${newTodos.length} todos`);
    await typegoose.getModelForClass(Todo).insertMany(newTodos);

    process.exit(0);

    // Unused tables:
    // command
    // command_alias
    // command_permissions
}

main();

process.on("unhandledRejection", async function(err)
{
    console.log(err);
    process.exit(1);
});

process.on("exit", async function(code)
{
    console.log(`exiting with code ${code}`);
});
