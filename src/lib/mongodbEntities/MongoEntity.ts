import * as mongodb from "mongodb";

export abstract class MongoEntity
{
    //[key: string]: any;
    _id?: mongodb.ObjectId;
}

export abstract class MongoDiscordEntity extends MongoEntity
{
    loadFromDiscord(discordObject: any): MongoDiscordEntity
    {
        throw new Error("Called a non-implemented loadFromDiscord!");
    }
}
