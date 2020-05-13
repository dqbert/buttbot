import {prop, index} from "@typegoose/typegoose";
import * as discord from "discord.js";
import { MongoEntity } from "@entities/MongoEntity";
import * as crypto from "crypto";

export enum KeywordTypesEnum
{
    KEEP = "KEEP",
    DELETE = "DELETE",
    EDIT = "EDIT",
    NOTIFY = "NOTIFY"/*,
    COMMAND = "COMMAND" -- Command not yet in use */
}

export class Keyword extends MongoEntity
{
    @prop({required: true})
    name?: string;

    @prop({required: true})
    guildID?: discord.Snowflake;

    @prop({ enum: KeywordTypesEnum, required: true })
    type?: KeywordTypesEnum;

    @prop()
    text?: string;

    @prop()
    commandName?: string;

    @prop()
    userID?: discord.Snowflake;

    @prop({required: true, unique: true})
    keywordHash?: string;

    toString()
    {
        return `${this.name} [${this.type}]${this.text ? `: ${this.text}` : ""}`;
    }

    createHash()
    {
        let newHash = crypto.createHash("sha256");
        newHash.update(`${this.name}${this.type}${this.text}`);
        this.keywordHash = newHash.digest('hex');
    }
}
