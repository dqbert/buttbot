import * as messaging from "@lib/messaging"
import * as typegoose from "@typegoose/typegoose"
import * as os from 'os'
import * as discord from "discord.js"
import * as logging from "@lib/logging"
import { IMessageCommand, DiscordPermissionsEnum, IMessageCommandUsage, CommandUsageError } from "@messageCommands/MessageCommandUtilties"
import { Role } from "@entities/Role"
import { Guild, GuildNotFoundError } from "@entities/Guild"
import { CommandsError } from "@messageCommands/MessageCommandProcessor"

interface IsubCommands
{
    [subParmName: string]: (message: discord.Message, splitMessage: RegExpMatchArray) => Promise<void>
}


class RoleCommand implements IMessageCommand
{
    name: string = "role"
    description: string = "Make users join or leave a managed role. Create, delete, and list managed roles. Enable or disable management of a role."
    isDefaultAdmin: boolean = true
    isEnabled: boolean = true
    requiresGuild: boolean = true
    permissions: DiscordPermissionsEnum[] = [DiscordPermissionsEnum.SEND_MESSAGES, DiscordPermissionsEnum.MANAGE_ROLES]
    usage: IMessageCommandUsage =
    {
        "__main__": `role [join/leave/create/delete/list/manage]`,
        "join": `role join "[role name]" "[username]"`,
        "leave": `role leave "[role name]" "[username]"`,
        "create": `role create "[new role name]"`,
        "delete": `role delete "[role name]"`,
        "list": `role list [role name]`,
        "manage": `role manage "[role name]"`
    }
    subCommands: IsubCommands =
    {
        "join": this.subCommandJoin.bind(this),
        "leave": this.subCommandLeave.bind(this),
        "create": this.subCommandCreate.bind(this),
        "delete": this.subCommandDelete.bind(this),
        "list": this.subCommandList.bind(this),
        "manage": this.subCommandManage.bind(this)
    }
    async process(message: discord.Message): Promise<void>
    {
        // Any time role based command is run, we should check the list of roles on the guild and also the roles we manage.
        // If we manage any that do not exist in the guild, then remove them from the guild in the database.
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }

        let existingRoles = new Set(message.guild!.roles.cache.map(role => role.id))
        Array.from(guild.roles.values()).map((role) =>
        {
            if (!existingRoles.has(role.id!))
            {
                guild!.roles.delete(role.id!)
            }
        })
        try
        {
            await guild.save()
        }
        catch (err)
        {
            logging.error(`Could not update guild for role`, guild)
            throw err
        }

        //             1            2             3
        //b/role [subcommand] "[role name]" [username]
        let splitMessage = message.content.match(/role (\w+)\s*(?:"([^"]*)")?\s*(.*)?/i)
        if (!splitMessage)
        {
            throw new CommandUsageError(this.usage.__main__)
        }
        let subCommand = splitMessage[1]?.toLowerCase()

        if (!subCommand)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        let subCommandFunction = this.subCommands[subCommand]

        if (!subCommandFunction)
        {
            throw new CommandUsageError(this.usage.__main__)
        }

        await subCommandFunction(message, splitMessage)
    }
    private getRole(message: discord.Message, roleName: string)
    {
        return(message.guild?.roles.cache.find(findRole => findRole.name.toLowerCase() == roleName.toLowerCase()))
    }
    private getMember(message: discord.Message, userName?: string)
    {
        let member: discord.GuildMember | undefined
        // If a username was specified, find the real user (possibly not message author)
        if (userName)
        {
            // If it's an @ mention, find the user ID
            if (userName.startsWith("<@"))
            {
                member = message.guild?.members.cache.get(userName.match(/\<\@(\d+)\>/i)?.[1] ?? "0")
            }
            // It's not an @ mention, find the user by name
            else
            {
                member = message.guild?.members.cache.find(member => member.user.username.toLowerCase() == userName.toLowerCase())
            }
        }
        // Otherwise, get the member of the message author
        else
        {
            member = message.guild?.members.cache.find(member => member.user.id == message.author.id)
        }

        if (!member)
        {
            if (!userName)
            {
                throw new Error("Couldn't get the guild member of the message author!")
            }
            else
            {
                throw new CommandsError(`There is no user with username ${userName} in this server.`)
            }
        }
        return(member)
    }
    private async isRoleManaged(message: discord.Message, role: discord.Role)
    {
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }
        let managedRole = guild.roles.get(role.id)

        return(!!managedRole)
    }
    private async subCommandJoin(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //        1        2             2
        //b/role join "[role name]" "[username]"
        let roleName = splitMessage[2]
        if (!roleName)
        {
            throw new CommandUsageError(this.usage.join)
        }
        let role = this.getRole(message, roleName)
        if (!role)
        {
            throw new CommandsError(`No role with name ${roleName} exists in this server.`)
        }
        let userName = splitMessage[3]?.toLowerCase()
        let member = this.getMember(message, userName)

        if (!(await this.isRoleManaged(message, role)))
        {
            throw new CommandsError(`Role ${role.name} is not managed by Buttbot. Try running the role manage command to manage this role first before joining users to it.`)
        }

        if (role.members.get(member.id))
        {
            throw new CommandsError(`Role "${role.name}" already includes member ${member.user.username}.`)
        }

        await member.roles.add(role, `Joined by Buttbot join command from user ${message.author.username}`)
        await messaging.send(`${member.user.username} has joined ${role.name}`, message.channel, message.author, message)
    }
    private async subCommandLeave(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //          1         2             3
        //b/role leave "[role name]" "[username]"
        let roleName = splitMessage[2]
        if (!roleName)
        {
            throw new CommandUsageError(this.usage.leave)
        }
        let role = this.getRole(message, roleName)
        if (!role)
        {
            throw new CommandsError(`No role with name ${roleName} exists in this server.`)
        }
        let userName = splitMessage[3]?.toLowerCase()
        let member = this.getMember(message, userName)

        if (!(await this.isRoleManaged(message, role)))
        {
            throw new CommandsError(`Role ${role.name} is not managed by Buttbot. Try running the role manage command to manage this role first before removing users from it.`)
        }

        if (!role.members.get(member.id))
        {
            throw new CommandsError(`Role ${role.name} does not include member ${member.user.username}.`)
        }

        //in role, delete from role
        await member.roles.remove(role.id, `Left from Buttbot leave command from user ${message.author.username}`)
        await messaging.send(`${member.user.username} has left ${role.name}`, message.channel, message.author, message)
    }
    private async subCommandCreate(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //          1         2
        //b/role create "[role name]"
        let roleName = splitMessage[2]
        if (!roleName)
        {
            throw new CommandUsageError(this.usage.create)
        }

        if(this.getRole(message, roleName))
        {
            throw new CommandsError(`A role with the name ${roleName} already exists in this server. To manage it, use the Buttbot role manage command.`)
        }

        let role = await message.guild!.roles.create(
        {
            data:
            {
                "name": roleName,
                "mentionable": true
            },
            reason: `Role created by Buttbot role create command by user ${message.author.username}`
        })

        if (!role)
        {
            throw new Error("Unable to create role!")
        }

        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }

        let roleEntity = new Role()
        roleEntity.createdDate = role.createdAt
        roleEntity.id = role.id
        roleEntity.name = role.name
        roleEntity.userID = message.author.id
        guild.addRole(roleEntity)
        try
        {
            await guild.save()
        }
        catch (err)
        {
            logging.error(`Could not update guild for role subCommandCreate`, guild)
            throw err
        }
        await messaging.send(`Created new managed role <@&${role.id}>`, message.channel, message.author, message)
    }
    private async subCommandDelete(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //          1         2
        //b/role delete "[role name]"
        let roleName = splitMessage[2]
        if (!roleName)
        {
            throw new CommandUsageError(this.usage.delete)
        }
        let role = this.getRole(message, roleName)
        if (!role)
        {
            throw new CommandsError(`No role with name ${roleName} exists in this server.`)
        }

        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }

        if (!guild.roles.delete(role.id))
        {
            throw new CommandsError(`Role ${role.name} is not managed by Buttbot.`)
        }

        try
        {
            await guild.save()
        }
        catch (err)
        {
            logging.error(`Coudl not update guild for role subCommandDelete`, guild)
            throw err
        }
        await role.delete(`Role deleted by Buttbot role delete command by user ${message.author.username}`)
        await messaging.send(`Deleted role: ${role.name}`, message.channel, message.author, message)
    }

    private async subCommandList(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //        1         2
        //b/role list [role name]
        let roleName = splitMessage[2] ?? splitMessage[3]
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }

        if (guild.roles.size == 0)
        {
            throw new CommandsError(`No roles are being managed on this server.`)
        }

        let managedRoles = Array.from(guild.roles.values()).filter(role => !!role.name && new RegExp(roleName, "gi").test(role.name))

        if (managedRoles.length == 0)
        {
            throw new CommandsError(`No roles have been found matching search ${roleName}`)
        }

        let response = ""

        managedRoles.forEach(role => response = `${response}- ${role.name}${os.EOL}`)
        await messaging.send(`Found managed roles:${os.EOL}\`\`\`${response}\`\`\``, message.channel, message.author, message)
    }

    private async subCommandManage(message: discord.Message, splitMessage:RegExpMatchArray)
    {
        //         1          2
        //b/role manage "[role name]"
        let roleName = splitMessage[2]

        if (!roleName)
        {
            throw new CommandUsageError(this.usage.manage)
        }

        let role = this.getRole(message, roleName)

        if (!role)
        {
            throw new CommandsError(`No role exists in this server with name ${roleName}`)
        }

        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id})
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id)
        }

        let response = ""

        if (guild.roles.has(role.id))
        {
            guild.roles.delete(role.id)
            response = `No longer managing role ${role.name}`
        }
        else
        {
            let managedRole = new Role()
            managedRole.createdDate = role.createdAt
            managedRole.id = role.id
            managedRole.name = role.name
            managedRole.userID = message.author.id
            guild.addRole(managedRole)
            response = `Now managing role ${role.name}`
        }

        try
        {
            await guild.save()
        }
        catch (err)
        {
            logging.error(`Could not update guild for role subCommandManage`, guild)
            throw err
        }
        await messaging.send(response, message.channel, message.author, message)
    }
}

export const command = new RoleCommand()
