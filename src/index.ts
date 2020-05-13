require('module-alias/register'); // Paths resolution
require('source-map-support').install(); // For proper .ts file error line mapping
import * as os from "os";
import * as logging from "@lib/logging";
import * as messageCommands from "@messageCommands/MessageCommandProcessor";
import * as consoleCommands from "@consoleCommands/ConsoleCommandProcessor";
import * as constants from "@lib/constants";
import * as keywords from "@lib/KeywordProcessor";
import * as MongoInterface from "@lib/MongoInterface";
import * as typegoose from "@typegoose/typegoose";
import * as MessageUtilities from "@lib/MessageUtilities";
import "@lib/discordOverrides";
import { Guild } from "@entities/Guild";
import { Todo } from "@entities/Todo";
import { Keyword } from "@entities/Keyword";

logging.log(`Buttbot script started${os.EOL}${'-'.repeat(50)}${os.EOL}`);

// Login to discord
constants.bot.login(constants.API_KEY.token).then(async function()
{
    logging.log("Buttbot login complete!");
});

// When we are ready, log that
constants.bot.on("ready", async function()
{
    logging.log("Buttbot ready!");
});

// Log joining new guild
constants.bot.on("guildCreate", async function(guild)
{
    logging.log(`Joined guild: ${guild}`);
});

// Log leaving a guild
constants.bot.on("guildDelete", async function(guild)
{
    logging.log(`Left guild: ${guild}`)
});

// Process incoming messages
constants.bot.on("message", async function(message)
{
    await MongoInterface.connection.awaitConnected();

    // If the message was not sent by a bot, process it
    if (!message.author.bot && message.author != constants.bot.user)
    {
        await MessageUtilities.registerMessage(message);

        // If a message is a command, process it
        if (await message.isBotCommand())
        {
            // Process the command
            messageCommands.process(message);
        }
        // Otherwise, check for keywords
        else
        {
            keywords.process(message);
        }
    }
});

// Log any bot warnings
constants.bot.on("warn", async function(warning)
{
    logging.warn(`Warning received: ${warning}`);
});

// Log discord bot list errors
constants.blAPI.on("error", (error) =>
{
    logging.error("Got an error from bot list API", error);
});

// Process console commands
process.stdin.on("readable", async function()
{
    await MongoInterface.connection.awaitConnected();
    let data = "";
    let lastData;
    while (!!(lastData = process.stdin.read()))
    {
        data += lastData?.toString() ?? "";
        lastData = process.stdin.read();
    }
    data = data?.trim();

    // If we got an input command, attempt to process it
    if (data && data.length > 1)
    {
        await consoleCommands.process(data);
    }
});

// Log any unhandled rejections so we are aware of them and are also able to handle them later
process.on("unhandledRejection", async function(error)
{
    logging.error("Got uncaught error:", error);
});

// Ensure we exit by gracefully destroying the bot, and log our exit return code
process.on("exit", function(rc)
{
    constants.bot.destroy();
    MongoInterface.connection.database?.disconnect();
    logging.log(`Exiting with RC ${rc}`);
});

typegoose.getModelForClass(Guild).ensureIndexes(err =>
{
    if (err)
    {
        logging.error("Got error with Guild ensureIndexes", err);
    }
});

typegoose.getModelForClass(Guild).on('index', err =>
{
    if (err)
    {
        logging.error("Got error with Guild index", err);
    }
});

typegoose.getModelForClass(Todo).ensureIndexes(err =>
{
    if (err)
    {
        logging.error("Got error with Todo ensureIndexes", err);
    }
});

typegoose.getModelForClass(Todo).on('index', err =>
{
    if (err)
    {
        logging.error("Got error with Todo index", err);
    }
});

typegoose.getModelForClass(Keyword).ensureIndexes(err =>
{
    if (err)
    {
        logging.error("Got error with Keyword ensureIndexes", err);
    }
});

typegoose.getModelForClass(Keyword).on('index', err =>
{
    if (err)
    {
        logging.error("Got error with Keyword index", err);
    }
});
