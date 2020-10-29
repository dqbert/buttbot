require("module-alias/register");
require('source-map-support').install(); // For proper .ts file error line mapping
import {Guild} from "@entities/Guild"
import * as typegoose from "@typegoose/typegoose"


// Clean up existing usages as they don't satisfy discord's policy
async function main()
{
    let guilds = await typegoose.getModelForClass(Guild).find({usages:{$exists:true,$ne:[]}})

    await Promise.all(guilds.map(async (guild) =>
    {
        guild.usages = []
        await guild.save()
    }))
    process.exit(0)
}

main()
