import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import * as Bets from "./index.js";
import { State } from "./state.js";
import { Strings } from "./strings.js";
import express from "express";
import { join } from "path";
import * as lk from "./lk.js";

const { TOKEN, HOST } = process.env;

const buttonsLogin = {
    keyboard: [
        [
            { text: Strings.LOG_IN_BUTTON, web_app: { url: HOST } }
        ]
    ]
};

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

/** @type {Record<number, number>} */
let states = {};

const prepare = async msg => {
    if(msg.chat.type !== "private") return false;
    const user = await Bets.getUserByTelegramID(msg.chat.id);
    if(!user)
        states[msg.chat.id] = State.TO_LOGIN;
    else
        states[msg.chat.id] = State.LOGGED_IN;
    return true;
}

bot.onText(/^\/start$/, async msg => {
    if(!await prepare(msg)) return;
    if(states[msg.chat.id] === State.TO_LOGIN)
        bot.sendMessage(msg.chat.id, Strings.HELLO, {
            reply_markup: buttonsLogin
        });
    else if(states[msg.chat.id] === State.LOGGED_IN)
        null; // TODO: send a message explaining what the menu does
});
bot.on("message", async msg => {
    if(!await prepare(msg)) return;
    if(!msg.web_app_data || !msg.web_app_data.data) return;
    const [username, password] = msg.web_app_data.data.split(":");
    const previous = await Bets.getUserByTelegramID(msg.chat.id);
    if(await Bets.getUserByUsername(username) && !previous) {
        bot.sendMessage(msg.chat.id, Strings.ALREADY_LOGGED_IN);
        return;
    }
    await bot.sendMessage(msg.chat.id, Strings.LOGGING_IN);
    states[msg.chat.id] = State.LOGGING_IN;
    try {
        // idk if this works but to be safe i won't store phpsessid in a variable
        const points = await lk.diplomaPoints(await lk.auth(username, password));
        if(!previous) await Bets.createUser(username, msg.chat.id);
        await Bets.updateUserBalance(username, points);
        states[msg.chat.id] = State.LOGGED_IN;
        bot.sendMessage(msg.chat.id, previous ? Strings.UPDATED_BALANCE : Strings.LOGGED_IN);
        // sendEvents(msg.chat.id, await Bets.getAllOngoingEvents());
    } catch(_) {
        bot.sendMessage(msg.chat.id, Strings.WRONG_CREDENTIALS);
        states[msg.chat.id] = State.TO_LOGIN;
    }
})

app.get("/", (_req, res) => res.sendFile(join(import.meta.dirname, "login.html")));

app.listen(8055);