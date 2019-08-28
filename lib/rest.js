//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const API_KEY = index.API_KEY;
const config = index.config;
const commands = index.commands;
var bot = index.bot;

const os = require('os');
const path = require('path');
const discord = require('discord.js');
const assert = require('assert');
const mysql = require('mysql');
const axios = require('axios');

//promisify functions for async/await
const util = require('util');

const git_instance = axios.create({
    baseURL: "https://api.github.com",
    timeout: 1000,
    headers:
    {
        "Authorization" : `token ${API_KEY.github_token}`
    }
});
const issues_url = "/repos/dqbert/buttbot/issues";

function buildBody(message)
{
    var body = `This issue is automatically generated as a pending suggestion from a buttbot command.`
    body = body + `${os.EOL}* The user that suggested this has username ${message.author.username} (${message.author.id}).`;

    //Collect guild information
    var guildOrChannel = config.guild.fromChannel(message.channel);
    if (guildOrChannel instanceof discord.Guild)
    {
        body = body + `${os.EOL}* The guild the message was sent in was named ${guildOrChannel.name} (${guildOrChannel.id})`;
        //Now get message channel
        guildOrChannel = message.channel;
    }

    //Collect channel information
    if (guildOrChannel instanceof discord.DMChannel)
    {
        body = body + `${os.EOL}* The channel the message was sent in was a DM channel.`;
    }
    else
    {
        body = body + `${os.EOL}* The channel the message was sent in was named ${guildOrChannel.name} (${guildOrChannel.id})`;
    }

    return body;
}

exports.issues = {};
exports.issues.get = async function()
{
    result = await git_instance.get(issues_url);
    return result.data;
}

//Assumes issue is pending
exports.issues.add = async function(message)
{
    assert.ok((message instanceof discord.Message), `Input ${message} is not a discord.Message!`);

    var titleFormatted = await commands.stripPrefix(message);
    titleFormatted = titleFormatted.split(' ').slice(1).join(' ');

    result = await git_instance.post(issues_url, {
        title: titleFormatted,
        body: buildBody(message),
        labels: [
            "pending"
        ]
    });
    return result.data;
}
