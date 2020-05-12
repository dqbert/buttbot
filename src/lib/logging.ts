import * as constants from "@lib/constants";
import * as fs from 'fs';
import * as os from 'os';
import pad from 'pad';
import * as path from 'path';
import * as util from 'util';

const writeFile = util.promisify(fs.writeFile);
var lastLogName = "";

enum ELogLevel
{
    INFO,
    WARNING,
    ERROR
}

function getLogfile()
{
    let curDate = new Date();
    let yearPad = curDate.getFullYear().toString();
    let monthPad = pad(2, String(curDate.getMonth() + 1), '0');
    let datePad = pad(2, String(curDate.getDate()), '0');
    let newLogName = path.resolve(constants.BOT_PATH, "../../logs", `${yearPad}.${monthPad}.${datePad}.log`);
    if (newLogName != lastLogName)
    {
        lastLogName = newLogName;
        log("Starting new log", lastLogName);
    }
    return lastLogName;
}

function getDateString(curDate?: Date)
{
    if (!curDate)
    {
        curDate = new Date();
    }
    return `[${curDate.toDateString()} ${pad(2, curDate.getHours().toString(), '0')}:${pad(2, curDate.getMinutes().toString(), '0')}:${pad(2, curDate.getSeconds().toString(), '0')}]`;
}
function doLog(logLevel: ELogLevel, args: any[])
{
    let message = args.map(arg => {
        if (typeof(arg) == "string")
        {
            return(arg);
        }
        else
        {
            return(util.inspect(arg));
        }
    }).join(os.EOL).trim();
    if (message)
    {
        message = `${getDateString()} ${message}`;
        if (logLevel == ELogLevel.WARNING)
        {
            message = `\x1b[33m${message}\x1b[0m`;
        }
        else if (logLevel == ELogLevel.ERROR)
        {
            message = `\x1b[31m${message}\x1b[0m`;
        }
        message = message.replace(new RegExp(`${os.EOL}`, 'g'), `${os.EOL}${getDateString()} `);
        console.log(message);
        message += os.EOL;
        writeFile(getLogfile(), message, {flag: "a"});
    }

}

export function log(...args: any[])
{
    doLog(ELogLevel.INFO, args);
}

export function warn(...args: any[])
{
    doLog(ELogLevel.WARNING, args);
}

export function error(...args: any[])
{
    doLog(ELogLevel.ERROR, args);
}
