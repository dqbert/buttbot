import * as discord from "discord.js"
import * as logging from "@lib/logging";
import * as messaging from "@lib/messaging";
import * as constants from "@lib/constants";
import * as typegoose from "@typegoose/typegoose";
import { Guild, GuildNotFoundError } from "@entities/Guild";
import * as messageCommands from "@messageCommands/MessageCommandUtilties";
import * as MessageUtilities from "@lib/MessageUtilities";

export class CommandsError extends Error
{
    constructor(message?: string)
    {
        super(message);

        Object.setPrototypeOf(this, CommandsError.prototype);
    }
}

// Create admin role for a guild if required
export async function createAdminRole(message: discord.Message)
{
    let guild = message.getButtbotGuild();
    let adminRole: discord.Role | undefined = undefined;
    let adminRoleID: discord.Snowflake | undefined = "";

    // Admin roles only exist in Guilds, not DM channels
    if (guild instanceof discord.Guild)
    {
        let guildEntity = await typegoose.getModelForClass(Guild).findOne({id: guild.id});
        if (!guildEntity)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id);
        }
        // Find the admin role
        adminRoleID = guildEntity.adminRoleID;
        if (adminRoleID)
        {
            adminRole = await guild.roles.fetch(adminRoleID) ?? undefined;
            /* something went wrong */
            if (!adminRole)
            {
                throw new CommandsError("Admin role could not be fetched.");
            }
        }
        // If not found, check if there is one with the name but not saved in the database
        else
        {
            adminRole = guild.roles.cache.find(role => role.name.toLowerCase() == "buttbot admins");
            // If still not found, create it
            if (!adminRole)
            {
                try {
                    adminRole = await guild.roles.create({
                    data: {
                        name: "Buttbot admins",
                        color: [139,69,19]
                    }, reason: "Admin role for buttbot admin users."});
                }
                catch (err) {
                    await messaging.send("Could not create admin role for guild! To use admin-only commands, make sure I have the permission \"MANAGE_ROLES\"", message.channel, message.author, message);
                    throw err;
                }
            }
            if (adminRole == null)
            {
                throw new Error("Could not get admin role for guild!");
            }

            guildEntity.adminRoleID = adminRole.id;
            try
            {
                await guildEntity.save();
            }
            catch (err)
            {
                logging.error(`Could not save guild for createAdminRole`, guildEntity);
                throw err;
            }
        }
    }
    return adminRole;
}

// Process incoming message based commands
export async function process(message: discord.Message)
{
    let splitMessage = (await message.stripBotPrefix()).match(/^(\w+)\s*(\w*)\s*(\w*)/i)
    try
    {
        if (!splitMessage)
        {
            throw new CommandsError();
        }
        let commandName = splitMessage[1];
        let command = messageCommands.findCommand(commandName);

        if (command)
        {
            // Do additional checks for commands run in a guild
            if (message.guild)
            {
                let botMember = await message.guild.members.fetch(constants.bot.user?.id ?? "");
                if (!botMember)
                {
                    throw new Error("Cannot find bot in guild!");
                }
                if (botMember.permissions.has(command.permissions, true))
                {
                    // Check if this command requires admin and we don't have admin role
                    let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id});
                    if (!guild)
                    {
                        throw new GuildNotFoundError(message.getButtbotGuild().id);
                    }

                    let commandEntity = guild.commands.get(commandName);

                    if (!commandEntity)
                    {
                         throw new Error(`Command not found: ${commandName}`);
                    }

                    // Not allowed
                    if (!commandEntity.isAllowed(message))
                    {
                        throw new CommandsError(`Error: You are not allowed to run this command. You must be a member of the "buttbot admins" role in this Guild.`);
                    }
                }
                // We don't have all the permissions
                else
                {
                    throw new CommandsError(`Error: I don't have the correct permissions for this command! (Permissions I need: ${command.permissions.toString()})`);
                }
            }
            // If not in a guild and the command requires a guild, throw an error
            else if (command.requiresGuild)
            {
                throw new CommandsError(`This command can only be run within a Discord server, not a DM channel.`);
            }

            // Log command in usage stats
            MessageUtilities.logUsage(message);

            // Get our command path for execution
            try
            {
                if (splitMessage[2]?.toLowerCase() == "help")
                {
                    throw new messageCommands.CommandUsageError(command.usage[splitMessage[3]?.toLowerCase()] ?? command.usage.__main__);
                }
                else
                {
                    if (command.isEnabled)
                    {
                        await command.process(message);
                    }
                }
            }
            catch (error)
            {
                if (error instanceof messageCommands.CommandUsageError)
                {
                    let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id});
                    if (!guild)
                    {
                        throw new GuildNotFoundError(message.getButtbotGuild().id);
                    }

                    await messaging.send(`Usage:
\`\`\`${guild.prefix}${error.message}\`\`\``, message.channel, message.author, message);
                }
                else
                {
                    throw error;
                }
            }
        }
        else
        {
            throw new CommandsError(`Invalid command: ${commandName}!`);
        }
    }
    catch (error)
    {
        if (error instanceof CommandsError)
        {
            await messaging.send(error.message ?? `Invalid command format: ${message.content}`, message.channel, message.author, message);
            if (!error.message)
            {
                logging.log(`Caught CommandsError exception with no message`, error);
            }
        }
        else
        {
            await messaging.send(`There was an error running your command. Please contact dqbert#0903 about this error.`, message.channel, message.author, message);
            throw error;
        }
    }
}
