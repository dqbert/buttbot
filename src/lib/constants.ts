import * as discord from "discord.js"
import DBLAPI from "dblapi.js"
import * as path from "path"
import * as API_KEY from "@api_key"

export {API_KEY}
export const BOT_PATH = path.resolve('./lib')
export const DEFAULT_PREFIX = "b/"
export const bot = new discord.Client()
export const blAPI = new DBLAPI(API_KEY.dbl_key, bot)
 
