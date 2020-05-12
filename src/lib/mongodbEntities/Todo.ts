import { prop } from "@typegoose/typegoose";
import { Guild } from "@entities/Guild";
import { Channel } from "@entities/Channel";
import { User } from "@entities/User";
import { MongoEntity } from "@entities/MongoEntity";

export class Todo extends MongoEntity
{
    @prop({ref: Guild})
    guild?: Guild;

    @prop({ref: Channel})
    channel?: Channel;

    @prop({ref: User})
    user?: User;

    @prop({required: true})
    text?: string;

    @prop({default: false})
    pending?: boolean;

    @prop()
    issueURL?: string;
}
