import mongoose from "mongoose"
import debug from "debug"
import * as constants from "@lib/constants"

const mongoDebug = debug("mongo")

const AWAIT_TIMEOUT = 1000; /* in ms */
class MongoConnection
{
    database?: typeof mongoose
    isConnecting: boolean = true
    constructor()
    {
        this.connect()
    }

    async connect()
    {
        this.isConnecting = true
        mongoDebug(`About to connect to mongodb://${constants.API_KEY.mongo_url}/${constants.API_KEY.mongo_db}`)
        this.database = await mongoose.connect(`mongodb://${constants.API_KEY.mongo_user}:${constants.API_KEY.mongo_pass}@${constants.API_KEY.mongo_url}/${constants.API_KEY.mongo_db}`, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false})
        this.database.set('debug', (collectionName: string, methodName: string, query: string, doc: string, options: string) =>
        {
            mongoDebug("%o %o %o %o %o", collectionName, methodName, query, doc, options)
        })
        this.isConnecting = false
        mongoDebug(`Mongodb connected to mongodb://${constants.API_KEY.mongo_url}/${constants.API_KEY.mongo_db}`)
    }
    async awaitConnected()
    {
        if (!this.database)
        {
            if (!this.isConnecting)
            {
                await this.connect()
            }
            else
            {
                await new Promise(resolve => setTimeout(resolve, AWAIT_TIMEOUT))
                await this.awaitConnected()
            }
        }
        else
        {
            this.isConnecting = false
        }
    }
}

export const connection = new MongoConnection()

export class DocumentNotFoundError extends Error
{
    constructor(message: string)
    {
        super(message)
        Object.setPrototypeOf(this, DocumentNotFoundError.prototype)
    }
}
