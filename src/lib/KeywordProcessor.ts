import * as discord from "discord.js"
import * as constants from "@lib/constants"
import * as messaging from "@lib/messaging"
import * as logging from "@lib/logging"
import * as typegoose from "@typegoose/typegoose"
import * as os from "os"
import "@lib/discordOverrides"
import { Guild } from "@entities/Guild"
import { KeywordTypesEnum, Keyword } from "@entities/Keyword"

// 1 hour in ms
const AWAIT_REACTION_IDLE = 60*60*1000

/**
 * Map holding original versions of edited messages.
 */
type MessageId = string
interface IEditSwap {
    originalContent: string,
    embed: discord.MessageEmbed
}
var editSwap = new Map<MessageId, IEditSwap>()

async function individualReactionHandler(message: discord.Message, reaction: discord.MessageReaction)
{
    await reaction.remove()
    if (editSwap.has(message.id))
    {
        let swap = editSwap.get(message.id)
        if (swap)
        {
            let newEmbed = swap.embed.setFooter("")
            await message.edit(newEmbed)
            await message.edit(swap.originalContent)
            editSwap.delete(message.id)
        }
        else
        {
            throw new ReferenceError("editSwap did not have entry for message" + message.toString())
        }
    }
}

async function messageReactionHandler(message: discord.Message)
{
    // Watch this message to allow for reaction toggle
    let reactions = await message.awaitReactions((reaction: discord.MessageReaction, user: discord.User) =>
    {
        return (reaction.emoji.name == "🔁" && !user.bot)
    }, {max: 1, idle: AWAIT_REACTION_IDLE})
    await Promise.all(reactions.map((reaction) => individualReactionHandler(message, reaction)))
}

export async function process(message: discord.Message)
{
    let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})

    if (guild && guild && message.member && constants.bot.user)
    {
        let keywords = await typegoose.getModelForClass(Keyword).find({guildID: guild.id})
        if (keywords)
        {
            let editMessage = ""
            let deleteMessage = false
            let sendMessages: string[] = []
            let notified = false

            // Process each found keyword in the order as they appear in the message
            keywords.forEach(keyword => keyword.name!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            let foundContent = keywords.filter(keyword => new RegExp(keyword.name!, "gi").test(message.content)).map(keyword => keyword.name!)

            keywords.filter(keyword => keyword.name && foundContent?.includes(keyword.name)).forEach((keyword) =>
            {
                if (keyword.type && keyword.name)
                {
                    // These keyword types require normal message sending
                    if ([KeywordTypesEnum.KEEP, KeywordTypesEnum.NOTIFY, KeywordTypesEnum.DELETE].includes(keyword.type) && keyword.text)
                    {
                        if (keyword.type == KeywordTypesEnum.NOTIFY && keyword.userID && !notified)
                        {
                            sendMessages.push(`<@${keyword.userID}>`)
                            notified = true
                        }
                        sendMessages.push(`${keyword.text}`)
                    }

                    // This keyword type requires a specially formatted embed to send
                    if (keyword.type == KeywordTypesEnum.EDIT)
                    {
                        if (editMessage == "")
                        {
                            editMessage = message.content
                        }
                        editMessage = editMessage.replace(new RegExp(keyword.name, "gi"), keyword.text ?? "")
                    }

                    // These keyword_types require deletion of message
                    // Don't delete a message with a URL in it
                    // Don't delete a message with attachments
                    if ([KeywordTypesEnum.DELETE, KeywordTypesEnum.EDIT].includes(keyword.type) && !/http.?:/gi.test(message.content) && message.attachments.size == 0)
                    {
                        deleteMessage = true
                    }
                }
            })

            // If we built a message, send it
            if (sendMessages.length > 0)
            {
                await messaging.send(sendMessages.join(os.EOL), message.channel, message.author, message)
            }

            // If we are going to edit the message, send the embed
            if (editMessage != "")
            {
                let embed = new discord.MessageEmbed(
                {
                    color: message.member.displayColor,
                    author:
                    {
                        name: message.member.displayName,
                        iconURL: message.member.user.displayAvatarURL()
                    },
                    footer:
                    {
                        text: "Click the 🔁 to retrieve your original message"
                    },
                    description: editMessage
                })
                let messages = await messaging.send(embed, message.channel)
                await Promise.all(messages.map(async (editedMessage: discord.Message) =>
                {
                    editSwap.set(editedMessage.id, 
                    {
                        originalContent: message.content,
                        embed: embed
                    })
                    // React so others can add to the reaction
                    try
                    {
                        await editedMessage.react("🔁")
                        messageReactionHandler(editedMessage)
                    }
                    catch (err)
                    {
                        logging.log("Couldn't react to an edit message!")
                        throw err
                    }
                }))
            }

            // If we have to delete the user's message, then delete it
            if (deleteMessage)
            {
                try
                {
                    await message.delete()
                }
                catch (err)
                {
                    await messaging.send(`Couldn't delete a message! I need the MANAGE_MESSAGES permission to do this.`, message.channel)
                    throw err
                }
            }
        }
    }
}
