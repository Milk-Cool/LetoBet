import TelegramBot from "node-telegram-bot-api";
import "dotenv/config";
import * as Bets from "./index.js";
import { State } from "./state.js";
import { Strings } from "./strings.js";
import express from "express";
import { join } from "path";
import * as lk from "./lk.js";

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", e => console.error(e));

const { TOKEN, HOST } = process.env;

const buttonLogin = { text: Strings.LOG_IN_BUTTON, web_app: { url: HOST } };
const buttonsLogin = {
    keyboard: [
        [buttonLogin]
    ]
};

const buttonUpdate = { text: Strings.UPDATE_BALANCE, web_app: { url: HOST } };
const buttonAllEvents = { text: Strings.ALL_EVENTS };
const buttonBalance = { text: Strings.BALANCE };
const buttonsMain = {
    keyboard: [
        [buttonUpdate],
        [buttonAllEvents, buttonBalance]
    ]
}

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.urlencoded({ extended: true }));

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

const chooseAction = async id =>
    await bot.sendMessage(id, Strings.CHOOSE_ACTION, {
        reply_markup: buttonsMain
    });

/**
 * @param {number} id Telegram ID
 * @param {Bets.Event[]} events Events
 */
const sendEvents = async (id, events) => {
    if(events.length == 0)
        return await bot.sendMessage(id, Strings.NO_EVENTS);
    for(const event of events) {
        const date = event.until;
        await bot.sendMessage(id, Strings.NEW_EVENT
            .replace("[[description]]", event.description)
            .replace("[[outcome_left]]", event.outcome_left)
            .replace("[[outcome_left_chance]]", event.outcome_left_chance)
            .replace("[[outcome_right]]", event.outcome_right)
            .replace("[[outcome_right_chance]]", event.outcome_right_chance)
            .replace("[[until]]", `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`)
        );
    }
};

bot.onText(/^\/start$/, async msg => {
    if(!await prepare(msg)) return;
    if(states[msg.chat.id] === State.TO_LOGIN)
        await bot.sendMessage(msg.chat.id, Strings.HELLO, {
            reply_markup: buttonsLogin
        });
    else if(states[msg.chat.id] === State.LOGGED_IN)
        await chooseAction(msg.chat.id);
});
bot.on("message", async msg => {
    if(!await prepare(msg)) return;
    if(!msg.web_app_data || !msg.web_app_data.data) return;
    const [username, password] = msg.web_app_data.data.split(":");
    const previous = await Bets.getUserByTelegramID(msg.chat.id);
    if(await Bets.getUserByUsername(username) && !previous) {
        await bot.sendMessage(msg.chat.id, Strings.ALREADY_LOGGED_IN);
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
        await bot.sendMessage(msg.chat.id, previous ? Strings.UPDATED_BALANCE : Strings.LOGGED_IN);
        await sendEvents(msg.chat.id, await Bets.getAllOngoingEvents());
        await chooseAction(msg.chat.id);
    } catch(_) {
        await bot.sendMessage(msg.chat.id, Strings.WRONG_CREDENTIALS);
        states[msg.chat.id] = State.TO_LOGIN;
    }
});

bot.on("message", async msg => {
    if(!await prepare(msg)) return;
    if(states[msg.chat.id] !== State.LOGGED_IN) return;
    switch(msg.text) {
        case Strings.BALANCE:
            const user = await Bets.getUserByTelegramID(msg.chat.id);
            await bot.sendMessage(msg.chat.id, Strings.BALANCE_IS + user.balance.toString());
            break;
        case Strings.ALL_EVENTS:
            await sendEvents(msg.chat.id, await Bets.getAllOngoingEvents());
            break;
        case "/start":
            break;
        default:
            await chooseAction(msg.chat.id);
    }
});

app.get("/", (_req, res) => res.sendFile(join(import.meta.dirname, "login.html")));
app.get("/admin", (_req, res) => res.sendFile(join(import.meta.dirname, "admin.html")));
app.post("/admin", async (req, res) => {
    /** @type {Bets.Event} */
    const event = {
        description: req.body.description,
        outcome_left: req.body.outcome_left,
        outcome_left_chance: parseFloat(req.body.outcome_left_chance),
        outcome_right: req.body.outcome_right,
        outcome_right_chance: parseFloat(req.body.outcome_right_chance),
        until: new Date(parseInt(req.body.until)),
    };
    await Bets.createEvent(event.description, event.outcome_left, event.outcome_left_chance, event.outcome_right, event.outcome_right_chance, event.until);
    for(const user of await Bets.getAllUsers()) {
        try {
            await sendEvents(user.telegram_id, [event]);
        } catch(e) {
            console.error(e);
        }
    }
    res.send("ok!");
});

app.listen(8055);