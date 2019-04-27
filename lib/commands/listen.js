//constants from main module
const index = module.parent.parent.exports;
const BOT_PATH = index.BOT_PATH;
const GUILD_PATH = index.GUILD_PATH;
const config = index.config;
const logging = index.logging;
const messaging = index.messaging;
var bot = index.bot;

//requires
const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const discord = require('discord.js');

//promisify fs functions for async/await
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

//voice receivers for persistance
var receivers = index.receivers;

var usage = "```Usage: listen [join/leave]```";

exports.description = "Listen in your voice channel for voice commands";
exports.requires_admin = false;

exports.process = async function(message) {
    messaging.send("This command doesn't do anything yet.", message.channel, message.author, message);
    return;
    var argv = message.content.split(' ');
    var subcommand = argv[1];

    if (message.guild === null || message.guild === undefined) {
        messaging.send("Error: This command only works from in a guild!", message.channel, message.author, message);
        return;
    }

    var message_guild = config.guild.fromChannel(message.channel);

    var voice_channels = message_guild.channels.filter(channel => channel.type === "voice");

    if (voice_channels.array() == null || voice_channels.array().length < 1) {
        messaging.send("Error: This guild has no voice channels for me to join!", message.channel, message.author, message);
        return;
    }

    var voice_channel = voice_channels.find(channel => channel.members.get(message.member.id) != null);

    if (subcommand === "join") {

        if (voice_channel == null) {
            messaging.send("Error: you must join a voice channel before I can join!", message.channel, message.author, message);
            return;
        }

        var voice_connection = await voice_channel.join();

        if (voice_connection == null) {
            messaging.send("Error: Couldn't initialize a connection to the voice channel!", message.channel, message.author, message);
            voice_channel.leave();
            return;
        }

        //create a new receiver for this user
        if (receivers.get(voice_channel.id) == null) {
            receivers.set(voice_channel.id, new Map());
        }

        var voice_stream = voice_connection.createReceiver();

        if (voice_stream == null) {
            messaging.send("Error: Couldn't initialize a connection to the voice channel!", message.channel, message.author, message);
            voice_channel.leave();
            return;
        }

        voice_stream.on("opus", (user, buffer) => {
            //logging.log(`got ${buffer.toString()} from ${user.username}`);
            //got the speech, now do something with it
        });

        receivers.get(voice_channel.id).set(message.author.id, voice_stream);

    }
    else if (subcommand === "leave") {

        if (voice_channel == null) {
            messaging.send("Error: you must join a voice channel for me to know which channel to leave!", message.channel, message.author, message);
            return;
        }

        if (receivers.get(voice_channel.id) != null && receivers.get(voice_channel.id).get(message.author.id) != null) {
            receivers.get(voice_channel.id).delete(message.author.id);
        }
        else {
            voice_channel.leave();
            return;
        }
        if (receivers.get(voice_channel.id).size < 1) {
            receivers.delete(voice_channel.id);
            voice_channel.leave();
        }

    }
    else {
        messaging.send(usage, message.channel, message.author, message);
    }
}
