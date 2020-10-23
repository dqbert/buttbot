import * as constants from "@lib/constants"
import "@lib/discordOverrides"
import * as os from "os"
import * as discord from "discord.js"
import axios from "axios"

const git_instance = axios.create(
{
    baseURL: "https://api.github.com",
    timeout: 1000,
    headers:
    {
        "Authorization" : `token ${constants.API_KEY.github_token}`
    }
})

function buildBody(message: discord.Message)
{
    let body = `This issue is automatically generated as a pending suggestion from a buttbot command.
* The user that suggested this has username ${message.author.username} (ID: ${message.author.id}).`

    // Collect guild information
    if (message.guild)
    {
        body = `${body}
* The guild the message was sent in was named ${message.guild.name} (ID: ${message.guild.id})`
    }
    //Collect channel information
    if (message.channel instanceof discord.DMChannel)
    {
        body = body + `${os.EOL}* The channel the message was sent in was a DM channel.`
    }
    else
    {
        body = body + `${os.EOL}* The channel the message was sent in was named ${message.channel.name} (ID: ${message.channel.id})`
    }

    return body
}

export async function getIssues()
{
    return (await git_instance.get(constants.API_KEY.github_url))
}

export async function addIssue(message: discord.Message, suggestion: string)
{
    return await git_instance.post(constants.API_KEY.github_url,
    {
        title: suggestion,
        body: buildBody(message),
        labels: [
            "pending"
        ]
    })
}
