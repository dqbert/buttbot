//constants from index.js
const index = module.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const logging = index.logging;
const API_KEY = index.API_KEY;
const config = index.config;
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
    timeout: 1000
});
const issues_url = "/repos/dqbert/buttbot/issues";

exports.issues = {};
exports.issues.get = async function()
{
    result = await git_instance.get(issues_url);
    console.log("Issues open:");
    result.data.forEach((data) => {
        var labelNames = [];
        data.labels.forEach((label) => {
            labelNames.push(label.name);
        });
        console.log(`Issue title: ${data.title}${os.EOL}  Issue link: ${data.html_url}${os.EOL}  Labels: ${labelNames.join(", ")}`);
    });
}
