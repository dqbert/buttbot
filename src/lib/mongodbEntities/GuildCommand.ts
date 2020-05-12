import {prop} from "@typegoose/typegoose";
import * as discord from "discord.js";
import * as messageCommands from "@messageCommands/MessageCommandProcessor";
import { MongoEntity } from "@entities/MongoEntity";

export class GuildCommand extends MongoEntity
{
    @prop({required: true})
    name?: string;

    @prop({required: true})
    requiresAdmin?: boolean;

    async isAllowed(message: discord.Message)
    {
        let result = true;
        // If the command doesn't need admin, then pass the check
        // If this is not in a guild, then pass the check
        if (this.requiresAdmin && message.guild != null)
        {
            // Get the admin role for this guild
            let adminRole = await messageCommands.createAdminRole(message);

            if (adminRole != null)
            {
                // We are a member of the admin role, so this is allowed
                if (message.member?.roles.cache.find(role => role.id == adminRole?.id) != null)
                {
                    result = true;
                }
                // Not a member of admin role, so this is not allowed
                else
                {
                    result = false;
                }

            }
            // If no admin role created, assume not allowed
            else
            {
                result = false;
            }
        }
        return(result);
    }
}
