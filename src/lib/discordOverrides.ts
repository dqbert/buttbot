import * as discord from "discord.js"
import {Guild, GuildNotFoundError} from "@entities/Guild"
import * as constants from "@lib/constants"
import * as typegoose from "@typegoose/typegoose"

declare module "discord.js"
{
    export interface Guild
    {
        toString(): string
    }
    export interface Client
    {
        findNewGuilds(message: discord.Message): Promise<void>
    }
    export interface Message
    {
        isBotCommand(): Promise<boolean>
        stripBotPrefix(): Promise<string>
        getButtbotGuild(): discord.Channel | discord.Guild
        getCommandName(): Promise<string>
    }
    export interface User
    {
        toString(): string
    }
    export interface TextChannel
    {
        toString(): string
    }
}

declare global
{
    export interface String
    {
        isBotCommand(prefix: string, userID: discord.Snowflake): boolean
        stripBotPrefix(prefix: string, userID: discord.Snowflake): string
        getCommandName(prefix?: string, userID?: discord.Snowflake): string
    }
}

discord.Guild.prototype.toString = function()
{
    return(`${this.name}<${this.id}>`)
}

discord.Message.prototype.getButtbotGuild = function()
{
    let returnValue: discord.DMChannel | discord.TextChannel | discord.NewsChannel | discord.Guild = this.channel
    if (!(returnValue instanceof discord.DMChannel))
    {
        returnValue = returnValue.guild
    }
    return returnValue
}

/**
 * Determine if this message has content which is a bot command based on prefix or @buttbot.
 * @return True if this is a bot command.
 */
discord.Message.prototype.isBotCommand = async function()
{
    let guild = await typegoose.getModelForClass(Guild).findOne({id: this.getButtbotGuild().id})
    if (!guild)
    {
        throw new GuildNotFoundError(this.getButtbotGuild().id)
    }
    return this.content.isBotCommand(guild.prefix, constants.bot!.user?.id ?? "")
}

/**
 * Determine if this string is a bot command based on it beginning with the command prefix or an @buttbot.
 * @param  prefix Command prefix to test for.
 * @param  userID Discord user ID of bot to test for.
 * @return        True if this is a bot comand.
 */
String.prototype.isBotCommand = function(prefix: string, userID: discord.Snowflake)
{
    return new RegExp(`^${prefix}`, 'g').test(this.toString()) ||
           new RegExp(`^<@!${userID}> `, 'g').test(this.toString())
}

/**
 * Remove the bot prefix or @buttbot from a message's content so that it can be parsed.
 * @return The string content with the prefix removed.
 */
discord.Message.prototype.stripBotPrefix = async function()
{
    let guild = await typegoose.getModelForClass(Guild).findOne({id: this.getButtbotGuild().id})
    if (!guild)
    {
        throw new GuildNotFoundError(this.getButtbotGuild().id)
    }
    return this.content.stripBotPrefix(guild.prefix, constants.bot?.user?.id ?? "")
}

String.prototype.stripBotPrefix = function(prefix: string, userID: discord.Snowflake)
{
    return this.replace(new RegExp(`^${prefix}`, 'g'), '')
               .replace(new RegExp(`^<@!${userID}> `, 'g'), '')
}

discord.Message.prototype.getCommandName = async function()
{
    let noPrefixContent = await this.stripBotPrefix()
    return noPrefixContent.getCommandName()
}

String.prototype.getCommandName = function(prefix?: string, userID?: discord.Snowflake)
{
    let commandName = ""
    let content = this
    if (prefix && userID)
    {
        content = content.stripBotPrefix(prefix, userID)
        if (content.isBotCommand(prefix, userID))
        {
            commandName = content.split(new RegExp("\\s"))[0]
        }
    }
    else
    {
        commandName = content.split(new RegExp("\\s"))[0]
    }
    return commandName
}

discord.User.prototype.toString = function()
{
    return(`${this.username}<@${this.id}>`)
}

discord.Channel.prototype.toString = function()
{
    if (this instanceof discord.GuildChannel)
    {
        return(`${this.name}<#${this.id}> (${this.constructor.name})`)
    }
    return(`<#${this.id}>`)
}
