import * as discord from "discord.js"
import * as typegoose from "@typegoose/typegoose"
import * as logging from "@lib/logging"
import * as constants from "@lib/constants"
import * as messageCommands from "@messageCommands/MessageCommandUtilties"
import { Guild, GuildNotFoundError } from "@entities/Guild"
import { DocumentNotFoundError } from "@lib/MongoInterface"
import { Usage } from "@entities/Usage"

export async function registerMessage(message: discord.Message)
{
    let guild = message.getButtbotGuild()
    let guildEntity = await typegoose.getModelForClass(Guild).findOne({id: guild.id})
    if (!guildEntity)
    {
        logging.log("Registering message for new guild", guild)
        let guildObject = new Guild()
        guildObject.id = guild.id
        if (guild instanceof discord.Guild)
        {
            guildObject.name = guild.name
        }
        guildObject.prefix = constants.DEFAULT_PREFIX
        guildEntity = await typegoose.getModelForClass(Guild).create(guildObject)
    }

    if (!guildEntity)
    {
        throw new GuildNotFoundError(message.getButtbotGuild().id)
    }

    guildEntity.addUser(message.author)
    guildEntity.addChannel(message.channel)
    await guildEntity.syncCommands(true)
    return guildEntity
}

export async function logUsage(message: discord.Message, replyTo?: discord.Message)
{
    let guild = message.getButtbotGuild()
    let guildEntity = await typegoose.getModelForClass(Guild).findOne({id: guild.id})

    // If this guild is not yet saved, we need to register this guild, user, etc
    if (!guildEntity)
    {
        await registerMessage(message)
        guildEntity = await typegoose.getModelForClass(Guild).findOne({id: guild.id})
        if (!guildEntity)
        {
            throw new GuildNotFoundError(guild.id)
        }
    }

    let commandName = await message.getCommandName()
    let command = messageCommands.findCommand(commandName)

    // If this is a buttbot command or a buttbot response, register it
    if (command || replyTo)
    {
        let userEntity = guildEntity.users.get(message.author.id)
        if (!userEntity)
        {
            throw new DocumentNotFoundError(`After message register, user ${message.author.id} was still not found`)
        }
        let guildChannel = guildEntity.channels.get(message.channel.id)
        if (!guildChannel)
        {
            throw new DocumentNotFoundError(`After message register, guild channel ${message.channel.id} was still not found`)
        }
        let usage = new Usage()
        usage.channelID = message.channel.id
        usage.commandName = command?.name
        usage.date = message.createdAt
        usage.messageID = message.id
        usage.replyTo = guildEntity.usages.find(findUsage => findUsage.messageID == replyTo)?._id
        usage.userID = message.author.id
        guildEntity.usages.push(usage)
        try
        {
            await guildEntity.save()
        }
        catch (err)
        {
            logging.error(`Could not save guild for logUsage`, guildEntity)
            throw err
        }
    }
}
