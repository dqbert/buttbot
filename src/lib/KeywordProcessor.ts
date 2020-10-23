import * as discord from "discord.js"
import * as constants from "@lib/constants"
import * as messaging from "@lib/messaging"
import * as logging from "@lib/logging"
import * as typegoose from "@typegoose/typegoose"
import * as os from "os"
import "@lib/discordOverrides"
import { Guild } from "@entities/Guild"
import { KeywordTypesEnum, Keyword } from "@entities/Keyword"

/**
 * JSON object holding original versions of edited messages.
 */
interface IEditSwap
{
    [messageID: string]: string
}
var editSwap: IEditSwap = {}

async function individualReactionHandler(message: discord.Message, reaction: discord.MessageReaction)
{
    await reaction.remove()
    if (message.content)
    {
        await message.edit(editSwap[message.id])
    }
    else
    {
        await message.edit("")
    }
}

async function messageReactionHandler(message: discord.Message)
{
    while (!message.deleted)
    {
        // Watch this message to allow for reaction toggle
        let reactions = await message.awaitReactions((reaction, user) =>
        {
            return (reaction.emoji.name == "🔁" && user.id != constants.bot.user?.id)
        })
        let reactionPromises: Array<Promise<void>> = []
        reactions.forEach(async (reaction) => {
            reactionPromises.push(individualReactionHandler(message, reaction))
        })

        Promise.all(reactionPromises)
    }
}

export async function process(message: discord.Message)
{
    let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})

    if (guild && guild && message.member && constants.bot.user)
    {
        let keywords = await typegoose.getModelForClass(Keyword).find({guildID: guild.id})
        if (keywords)
        {
            let embed = new discord.MessageEmbed()
            .setColor(message.member.displayColor)
            .setAuthor(message.member.displayName, message.member.user.displayAvatarURL())
            .setFooter("Click the 🔁 to retrieve your original message")
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
                embed.setDescription(editMessage)
                (await messaging.send(embed, message.channel)).forEach((editedMessage) =>
                {
                    editSwap[editedMessage.id] = message.content
                    // React so others can add to the reaction
                    try
                    {
                        editedMessage.react("🔁")
                        messageReactionHandler(editedMessage)
                    }
                    catch (err)
                    {
                        logging.log("Couldn't react to an edit message!")
                        throw err
                    }
                })
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
