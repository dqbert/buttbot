import * as discord from "discord.js";
import { prop } from "@typegoose/typegoose";
import { MongoDiscordEntity } from "@entities/MongoEntity";

export class User extends MongoDiscordEntity
{
    @prop({required: true})
    id?: discord.Snowflake;

    @prop({required: true})
    name?: string;

    loadFromDiscord(user: discord.User)
    {
        this.id = user.id;
        this.name = user.username;
        return this;
    }
}
