import * as logging from "@lib/logging";
import * as discord from "discord.js";
import * as MessageUtilities from "@lib/MessageUtilities";

// Send a text message to a channel
export async function send(message: string | discord.MessageEmbed, channel: discord.TextChannel | discord.DMChannel | discord.NewsChannel, user?: discord.User, replyTo?: discord.Message)
{
    let sentMessages: discord.Message[] = [];
    let messageString = "";
    let messageEmbed: discord.MessageEmbed | undefined;
    if (message instanceof discord.MessageEmbed)
    {
        messageEmbed = message;
    }
    else
    {
        messageString = message;
    }
    try
    {
        while (messageString.length > 0 || messageEmbed)
        {
            let sentMessage = await channel.send(messageString.substring(0, 1999), messageEmbed);
            messageEmbed = undefined;
            sentMessages.push(sentMessage);
            messageString = messageString.substring(1999);
            // If there's a user, log this message for that user
            if (user)
            {
                MessageUtilities.logUsage(sentMessage, replyTo);
            }
        }
    }
    catch (err)
    {
        if (user)
        {
            let errorMessageContent = `I couldn't send a message`;
            if (channel instanceof discord.TextChannel)
            {
                errorMessageContent.concat(` to channel ${channel.name}`)
            }
            errorMessageContent.concat(` because I don't have permissions to send messages!`)
            let errorMessage = await user.send(errorMessageContent);
            // Alter the properties for the usage log to make more sense
            errorMessage.author = user;
            errorMessage.channel = channel;
            errorMessage.content = `[sent as error] ${errorMessage.content}`;
            sentMessages.push(errorMessage);
            MessageUtilities.logUsage(errorMessage, replyTo);
            logging.log(`Couldn't send message because of ${err.message}`);
        }
        else
        {
            logging.log("Couldn't send message!");
            throw err;
        }
    }
    return sentMessages;
}
