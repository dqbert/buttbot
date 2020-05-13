import * as messaging from "@lib/messaging";
import * as discord from "discord.js";
import * as os from 'os';
import * as typegoose from "@typegoose/typegoose";
import * as logging from "@lib/logging";
import { IMessageCommand, DiscordPermissionsEnum, CommandUsageError, IMessageCommandUsage } from "@messageCommands/MessageCommandUtilties";
import { KeywordTypesEnum, Keyword } from "@entities/Keyword";
import { Guild, GuildNotFoundError } from "@entities/Guild";
import { MongoError } from "mongodb";
import { CommandsError } from "@messageCommands/MessageCommandProcessor";

interface ISubCommand
{
    [subCommand: string]: (message: discord.Message, splitMessage: RegExpMatchArray) => Promise<any>;
}

class CommandKeyword implements IMessageCommand
{
    name: string = "keyword";
    description: string = "Manage buttbot keywords. Comes with 3 subcommands: add, list, and delete.";
    isDefaultAdmin: boolean = false;
    isEnabled: boolean = true;
    permissions: DiscordPermissionsEnum[] =
    [
        DiscordPermissionsEnum.SEND_MESSAGES,
        DiscordPermissionsEnum.MANAGE_MESSAGES,
        DiscordPermissionsEnum.ADD_REACTIONS
    ];
    subcommands: ISubCommand =
    {
        "add": this.subCommandAdd.bind(this),
        "list": this.subCommandList.bind(this),
        "delete": this.subCommandDelete.bind(this)
    }
    usage: IMessageCommandUsage =
    {
        "__main__": "keyword [add, list, delete]",
        "add": `keyword add \"keyword (can have spaces)\" [${Object.keys(KeywordTypesEnum).join(", ").toLowerCase()}] [what to say in response or replace keyword with (optional)]"
Keep - do not modify the speaker's message, and say a response.
Delete - delete the speaker's message (if allowed), and say a response.
Edit - replace the speaker's message with a modified version of their message.
Notify - have buttbot mention you in a message whenever that keyword is sent by a user.`,
        "list": `keyword list [keyword search criteria (can have spaces, optional)]
View all keywords or keywords which match the optionally specified keyword.`,
        "delete": `keyword delete [keyword (can have spaces)]
        Delete a keyword from the list of watched keywords.`
    }
    async process(message: discord.Message): Promise<void>
    {
        // Command format:
        // b/keyword (subCommand) "keywordName" keywordType keywordText
        let splitMessage = message.content.match(/keyword (\w+)\s*(?:"(.+)")?\s*(\w+)?\s*(.*)?/);

        if (!splitMessage)
        {
            throw new CommandUsageError(this.usage.__main__);
        }

        let subCommand = this.subcommands[splitMessage[1].toLowerCase()];

        if (!subCommand)
        {
            throw new CommandUsageError(this.usage.__main__);
        }

        await subCommand(message, splitMessage);
    }

    private async subCommandAdd(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //            1        2            3           4
        // b/keyword add "keywordName" keywordType keywordText
        let keyword = new Keyword();
        keyword.name = this.getKeywordName(splitMessage, true);

        if (!keyword.name)
        {
            throw new CommandUsageError(this.usage.add);
        }

        let keywordTypeString = splitMessage[3];
        if (!keywordTypeString)
        {
            throw new CommandUsageError(this.usage.add);
        }

        keyword.type = KeywordTypesEnum[keywordTypeString.toUpperCase() as keyof typeof KeywordTypesEnum];

        if (!keyword.type)
        {
            throw new CommandsError(`Invalid keyword type "${keywordTypeString}". Valid types are: ${Object.keys(KeywordTypesEnum).join(", ").toLowerCase()}`);
        }

        keyword.text = splitMessage[4];

        if ([KeywordTypesEnum.KEEP, KeywordTypesEnum.EDIT].includes(keyword.type) && !keyword.text)
        {
            throw new CommandsError(`Keyword type ${keywordTypeString} requires a response parameter (the third parameter to keyword add).`);
        }

        keyword.userID = message.author.id;
        keyword.guildID = message.getButtbotGuild().id;
        let guild = await typegoose.getModelForClass(Guild).findOne({id: message.getButtbotGuild().id});
        if (!guild)
        {
            throw new GuildNotFoundError(message.getButtbotGuild().id);
        }
        keyword.createHash();

        try
        {
            await typegoose.getModelForClass(Keyword).create(keyword);
        }
        catch (err)
        {
            if (err instanceof MongoError && err.code == 11000)
            {
                throw new CommandsError("Keyword not added: keyword defintion already exists!");
            }
            else
            {
                logging.error(`Could not add keyword for subCommandAdd`, keyword);
                throw err;
            }
        }
        await messaging.send(`Keyword added successfully!
\`\`\`${keyword.toString()}\`\`\``, message.channel, message.author, message);
    }

    private async subCommandList(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //             1           2
        // b/keyword list "keywordNameSearch"
        let response = "";
        let keywordName = this.getKeywordName(splitMessage);

        // Set default response (for keyword search failure)
        if (keywordName)
        {
            response = `No keywords match your search: "${keywordName}"`;
        }
        else
        {
            keywordName = "";
            response = "No keywords are defined for this server";
        }

        // Get list of keywords matching our pattern
        let keywords = await typegoose.getModelForClass(Keyword).find({guildID: message.getButtbotGuild().id});
        let foundKeywords = keywords.filter(keyword => keyword.name && new RegExp(keywordName!, "gi").test(keyword.name));

        if (foundKeywords.length == 0)
        {
            await messaging.send(response, message.channel, message.author, message);
        }
        else
        {
            response = `Here is a list of keywords matching your search:${os.EOL}\`\`\``;

            foundKeywords.forEach((keyword) => {
                response += `${keyword.toString()}${os.EOL}`;
            });
            response += "```";

            await messaging.send(response, message.channel, message.author, message);
        }
    }

    private async subCommandDelete(message: discord.Message, splitMessage: RegExpMatchArray)
    {
        //            1          2
        //b/keyword delete "keywordName"
        let keywordName = this.getKeywordName(splitMessage);

        if (!keywordName)
        {
            throw new CommandUsageError(this.usage.delete);
        }

        let keywords = await typegoose.getModelForClass(Keyword).find({guildID: message.getButtbotGuild().id});
        let deletedKeywords = keywords.filter(keyword => keyword.name?.toLowerCase() == keywordName);

        if (deletedKeywords.length > 0)
        {
            let response = `Keywords deleted successfully!${os.EOL}\`\`\``;

            deletedKeywords.forEach(keyword =>
            {
                response += `${keyword.toString()}${os.EOL}`;
            });

            response += "```";

            let deletePromises: Promise<any>[] = [];
            try
            {
                deletedKeywords.forEach(keyword => deletePromises.push(keyword.remove()));
                await Promise.all(deletePromises);
            }
            catch (err)
            {
                logging.error(`Could not delete keywords for subCommandDelete`, deletedKeywords, deletePromises);
                throw err;
            }

            await messaging.send(response, message.channel, message.author, message);
        }
        else
        {
            throw new CommandsError(`No keywords were removed matching search: "${keywordName}"`);
        }
    }

    private getKeywordName(splitMessage: RegExpMatchArray, requiresQuotes?: boolean): string | undefined
    {
        let result = splitMessage[2];
        if (!requiresQuotes && !result)
        {
            result = splitMessage[3];
            if (result)
            {
                result += (splitMessage[4] ? ` ${splitMessage[4]}` : "");
            }
            else
            {
                result = splitMessage[4];
            }
        }
        return result?.toLowerCase();
    }
}

export const command = new CommandKeyword();
