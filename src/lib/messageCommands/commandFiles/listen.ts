import * as messaging from "@lib/messaging"
import * as discord from "discord.js"
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage } from "@messageCommands/MessageCommandUtilties"
import { CommandsError } from "@messageCommands/MessageCommandProcessor"

//voice receivers for persistance
var receivers: Array<discord.VoiceReceiver> = []

class ListenCommand implements IMessageCommand
{
    name: string = "listen"
    description: string = "Listen in your currently connected voice channel for voice commands."
    isDefaultAdmin: boolean = false
    isEnabled: boolean = false
    requiresGuild: boolean = true
    permissions: DiscordPermissionsEnum[] = []
    usage: IMessageCommandUsage =
    {
        "__main__": "listen [join/leave]"
    }
    async process(message: discord.Message): Promise<void>
    {
        throw new CommandsError("This command does not do anything yet.")
        // var argv = message.content.split(' ')
        // var subcommand = argv[1]
        //
        // if (message.guild === null || message.guild === undefined) {
        //     await messaging.send("Error: This command only works from in a guild!", message.channel, message.author, message)
        //     return
        // }
        //
        // let guild = message.getButtbotGuild()
        //
        // if (guild instanceof discord.Guild)
        // {
        //     let voiceChannels = guild.channels.filter(channel => channel.type === "voice")
        //
        //     if (voice_channels.array() == null || voice_channels.array().length < 1) {
        //         await messaging.send("Error: This guild has no voice channels for me to join!", message.channel, message.author, message)
        //         return
        //     }
        //
        //     var voice_channel = voice_channels.find(channel => channel.members.get(message.member.id) != null)
        //
        //     if (subcommand === "join") {
        //
        //         if (voice_channel == null) {
        //             await messaging.send("Error: you must join a voice channel before I can join!", message.channel, message.author, message)
        //             return
        //         }
        //
        //         var voice_connection = await voice_channel.join()
        //
        //         if (voice_connection == null) {
        //             await await messaging.send("Error: Couldn't initialize a connection to the voice channel!", message.channel, message.author, message)
        //             voice_channel.leave()
        //             return
        //         }
        //
        //         //create a new receiver for this user
        //         if (receivers.get(voice_channel.id) == null) {
        //             receivers.set(voice_channel.id, new Map())
        //         }
        //
        //         var voice_stream = voice_connection.createReceiver()
        //
        //         if (voice_stream == null) {
        //             await messaging.send("Error: Couldn't initialize a connection to the voice channel!", message.channel, message.author, message)
        //             voice_channel.leave()
        //             return
        //         }
        //
        //         voice_stream.on("opus", (user, buffer) => {
        //             //logging.log(`got ${buffer.toString()} from ${user.username}`)
        //             //got the speech, now do something with it
        //         })
        //
        //         receivers.get(voice_channel.id).set(message.author.id, voice_stream)
        //
        //     }
        //     else if (subcommand === "leave") {
        //
        //         if (voice_channel == null) {
        //             await messaging.send("Error: you must join a voice channel for me to know which channel to leave!", message.channel, message.author, message)
        //             return
        //         }
        //
        //         if (receivers.get(voice_channel.id) != null && receivers.get(voice_channel.id).get(message.author.id) != null) {
        //             receivers.get(voice_channel.id).delete(message.author.id)
        //         }
        //         else {
        //             voice_channel.leave()
        //             return
        //         }
        //         if (receivers.get(voice_channel.id).size < 1) {
        //             receivers.delete(voice_channel.id)
        //             voice_channel.leave()
        //         }
        //
        //     }
        //     else {
        //         await messaging.send(usage, message.channel, message.author, message)
        //     }
        // }
        // else
        // {
        //     throw new CommandsError("This command can only be run from within a discord server, not a DM.")
        // }
    }
}

export const command = new ListenCommand()
