import * as discord from "discord.js";
import { prop, mapProp, index, arrayProp } from "@typegoose/typegoose";
import * as constants from "@lib/constants";
import {GuildCommand} from "@entities/GuildCommand";
import { Channel } from "@entities/Channel";
import { Role } from "@entities/Role";
import { User } from "@entities/User";
import { MongoDiscordEntity } from "@entities/MongoEntity";
import * as messageCommands from "@messageCommands/MessageCommandUtilties";
import * as typegoose from "@typegoose/typegoose";
import * as logging from "@lib/logging";
import { Usage } from "@entities/Usage";
import { DocumentNotFoundError } from "@lib/MongoInterface";

function doSearch<T extends {[key: string]: any}, K extends keyof T>(search: any, map: Map<any, T>, propertyList: K[])
{
    for (let item of map.values())
    {
        for (let property in propertyList)
        {
            if (typeof(search) == "string")
            {
                search = new RegExp(search, "gi");
            }
            if ((search instanceof RegExp && search.test(item[property])) || search == item[property])
            {
                return item
            }
        }
    }
    return undefined;
}

export class Guild extends MongoDiscordEntity
{
    @prop({unique: true, required: true, index: true})
    id?: discord.Snowflake;

    @prop({default: constants.DEFAULT_PREFIX, required: true})
    prefix: string = constants.DEFAULT_PREFIX;

    @prop()
    adminRoleID?: discord.Snowflake;

    @prop({})
    name?: string;

    @mapProp({of: GuildCommand})
    commands: Map<string, GuildCommand> = new Map();

    @mapProp({of: Channel})
    channels: Map<discord.Snowflake, Channel> = new Map();

    @mapProp({of: Role})
    roles: Map<discord.Snowflake, Role> = new Map();

    @arrayProp({items: Usage})
    usages: Usage[] = [];

    @mapProp({of: User})
    users: Map<discord.Snowflake, User> = new Map();

    async syncCommands(this: typegoose.DocumentType<Guild>, save?: boolean)
    {
        let allNames = new Set(Array.from(this.commands.values(), command => command.name));
        let missingCommands = messageCommands.commands.filter(command => !allNames.has(command.name));
        for (let command of missingCommands)
        {
            let newCommand = new GuildCommand();
            newCommand.name = command.name;
            newCommand.requiresAdmin = command.isDefaultAdmin;
            //promises.push(commandRepository.save(guildCommand));
            this.addCommand(newCommand);
        }

        if (save)
        {
            try
            {
                await this.save();
            }
            catch (err)
            {
                logging.error(`Could not update or create guild for syncCommands`, this);
                throw err;
            }
        }
    }

    loadFromDiscord(guild: discord.Guild | discord.Channel)
    {
        this.id = guild.id;
        if (guild instanceof discord.Guild)
        {
            this.name = guild.name;
        }
        return this;
    }

    addCommand(command: GuildCommand)
    {
        if (command.name)
        {
            this.commands.set(command.name, command);
        }
    }

    findCommand<T extends keyof GuildCommand>(search: string | RegExp, propertyList?: T[])
    {
        let internalPropertyList = propertyList ?? <T[]> ["name"];

        return doSearch(search, this.commands, internalPropertyList);
    }

    addChannel(channel: Channel | discord.Channel)
    {
        if (channel instanceof discord.Channel)
        {
            channel = new Channel().loadFromDiscord(channel);
        }

        if (channel.id)
        {
            this.channels.set(channel.id, channel);
        }
    }

    findChannel<T extends keyof Channel>(search: string | RegExp, propertyList?: T[])
    {
        let internalPropertyList = propertyList ?? <T[]> ["name"];

        return doSearch(search, this.channels, internalPropertyList);
    }

    addRole(role: Role | discord.Role)
    {
        if (role instanceof discord.Role)
        {
            role = new Role().loadFromDiscord(role);
        }

        if (role.id)
        {
            this.roles.set(role.id, role);
        }
    }

    findRole<T extends keyof Role>(search: string | RegExp, propertyList?: T[])
    {
        let internalPropertyList = propertyList ?? <T[]> ["name"];
        return doSearch(search, this.roles, internalPropertyList);
    }

    addUser(user: User | discord.User)
    {
        if (user instanceof discord.User)
        {
            user = new User().loadFromDiscord(user);
        }

        if (user.id)
        {
            this.users.set(user.id, user);
        }
    }

    findUser<T extends keyof User>(search: string | RegExp, propertyList?: T[])
    {
        let internalPropertyList = propertyList ?? <T[]> ["name"];
        return doSearch(search, this.users, internalPropertyList);
    }
}

export class GuildNotFoundError extends DocumentNotFoundError
{
    constructor(guildID: discord.Snowflake)
    {
        super(`No guild found for ID ${guildID}`);
        Object.setPrototypeOf(this, GuildNotFoundError.prototype);
    }
}
