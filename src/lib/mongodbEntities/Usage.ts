import * as discord from "discord.js";
import * as mongodb from "mongodb";
import { prop } from "@typegoose/typegoose";
import { MongoEntity } from "@entities/MongoEntity";

export class Usage extends MongoEntity
{
    @prop({required: true})
    userID?: discord.Snowflake;

    @prop({required: true})
    messageID?: discord.Snowflake;

    @prop()
    commandName?: string;

    @prop({required: true})
    channelID?: discord.Snowflake;

    @prop({required: true})
    text?: string;

    @prop({required: true})
    date?: Date;

    @prop() // Reference to another Usage
    replyTo?: mongodb.ObjectId;
}
