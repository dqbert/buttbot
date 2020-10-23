import {prop} from "@typegoose/typegoose"
import * as discord from "discord.js"
import { MongoDiscordEntity } from "@entities/MongoEntity"

export class Role extends MongoDiscordEntity
{
    @prop({required: true})
    id?: discord.Snowflake

    @prop({required: true})
    name?: string

    @prop()
    userID?: discord.Snowflake

    @prop()
    createdDate?: Date

    loadFromDiscord(role: discord.Role)
    {
        this.id = role.id
        this.name = role.name
        this.createdDate = role.createdAt
        return this
    }
}
