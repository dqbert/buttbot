import {prop, index} from "@typegoose/typegoose";
import * as discord from "discord.js";
import { MongoEntity } from "@entities/MongoEntity";

export enum KeywordTypesEnum
{
    KEEP = "KEEP",
    DELETE = "DELETE",
    EDIT = "EDIT",
    NOTIFY = "NOTIFY"/*,
    COMMAND = "COMMAND" -- Command not yet in use */
}

@index({name: 1, type: 1, text: 1}, {unique: true})
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

    toString()
    {
        return `${this.name} [${this.type}]${this.text ? `: ${this.text}` : ""}`;
    }
}
