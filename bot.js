import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import * as Bets from "./index.js";
import { State } from "./state.js";
import { Strings } from "./strings.js";
import express from "express";

const { TOKEN, HOST } = process.env;

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
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: Strings.LOG_IN_BUTTON, web_app: { url: HOST } }
                    ]
                ]
            }
        });
    else
        null; // TODO: send a message explaining what the menu does
});

app.listen(8055);