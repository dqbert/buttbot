import * as discord from "discord.js";
import {prop} from "@typegoose/typegoose";
import { MongoDiscordEntity } from "@entities/MongoEntity";

export class Channel extends MongoDiscordEntity
{
    @prop({required: true})
    id?: discord.Snowflake;

    @prop()
    roleID?: discord.Snowflake;

    @prop()
    name?: string;

    @prop({required: true})
    isTextChannel?: boolean;

    loadFromDiscord(channel: discord.Channel)
    {
        this.id = channel.id;
        if (channel instanceof discord.TextChannel)
        {
            this.name = channel.name;
            this.isTextChannel = true;
        }
        else
        {
            this.isTextChannel = false;
        }
        return this;
    }
}
