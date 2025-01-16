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

const { TOKEN, HOST, PASSWORD } = process.env;

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

const buttonCancel = { text: Strings.CANCEL };
const buttonsPlacing = {
    keyboard: [
        [buttonCancel]
    ]
};

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

app.use(express.urlencoded({ extended: true }));

/** @type {Record<number, number>} */
let states = {};
/** @type {Record<number, [number, number]>} */
let placing = {};

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
        const date = typeof event.until === "number" ? new Date(event.until) : event.until;
        await bot.sendMessage(id, Strings.NEW_EVENT
            .replace("[[description]]", event.description)
            .replace("[[outcome_left]]", event.outcome_left)
            .replace("[[outcome_left_chance]]", Math.round(event.outcome_left_chance * 100))
            .replace("[[outcome_right]]", event.outcome_right)
            .replace("[[outcome_right_chance]]", Math.round(event.outcome_right_chance * 100))
            .replace("[[until]]", `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`),
        {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: event.outcome_left,
                        callback_data: "L" + event.id.toString()
                    }, {
                        text: event.outcome_right,
                        callback_data: "R" + event.id.toString()
                    }]
                ]
            }
        });
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
    if(msg.chat.id in placing) {
        if(msg.text == Strings.CANCEL) {
            delete placing[msg.chat.id];
            await bot.sendMessage(msg.chat.id, Strings.CANCELLED);
            await chooseAction(msg.chat.id);
            return;
        }
        if(!await Bets.checkEvent(placing[msg.chat.id][0])) {
            delete placing[msg.chat.id];
            await bot.sendMessage(msg.chat.id, Strings.EVENT_FINISHED);
            await chooseAction(msg.chat.id);
            return;
        }
        const user = await Bets.getUserByTelegramID(msg.chat.id);
        const amount = parseInt(msg.text);
        if(amount === NaN || amount < 1 || amount > user.balance)
            return await bot.sendMessage(msg.chat.id, Strings.INVALID_BET, { reply_markup: buttonsPlacing });
        await Bets.placeBet(msg.chat.id, placing[msg.chat.id][0], placing[msg.chat.id][1], amount);
        await Bets.deductPointsFromBalance(user.id, amount);
        delete placing[msg.chat.id];
        await bot.sendMessage(msg.chat.id, Strings.PLACED);
        return await chooseAction(msg.chat.id);
    }
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

bot.on("callback_query", async query => {
    // console.log(query);
    if(!(query.from.id in states)) {
        const user = await Bets.getUserByTelegramID(query.from.id);
        if(!user) return;
    }
    if(query.data.length == 0) return;
    const outcome = query.data[0] == "L" ? 0 : 1;
    const event_id = parseInt(query.data.slice(1));
    if(!await Bets.checkEvent(event_id))
        return await bot.sendMessage(query.from.id, Strings.EVENT_FINISHED);
    if(await Bets.getBet(query.from.id, event_id))
        return await bot.sendMessage(query.from.id, Strings.ALREADY_PLACED);
    placing[query.from.id] = [event_id, outcome];
    await bot.sendMessage(query.from.id, Strings.ENTER_BET, { reply_markup: buttonsPlacing });
});

app.get("/", (_req, res) => res.sendFile(join(import.meta.dirname, "login.html")));
app.get("/admin", (_req, res) => res.sendFile(join(import.meta.dirname, "admin.html")));
app.post("/admin", async (req, res) => {
    if(!req.body.description || !req.body.outcome_left
        || !req.body.outcome_left_chance || !req.body.outcome_right
        || !req.body.outcome_right_chance || !req.body.until
        || !req.body.password
    ) return res.status(400).send("bad request");
    if(req.body.password != PASSWORD) return res.status(418).send("wrong password");
    /** @type {Bets.Event} */
    const eventJSON = {
        description: req.body.description,
        outcome_left: req.body.outcome_left,
        outcome_left_chance: parseFloat(req.body.outcome_left_chance),
        outcome_right: req.body.outcome_right,
        outcome_right_chance: parseFloat(req.body.outcome_right_chance),
        until: new Date(parseInt(req.body.until)),
    };
    const event = await Bets.createEvent(eventJSON.description, eventJSON.outcome_left, eventJSON.outcome_left_chance, eventJSON.outcome_right, eventJSON.outcome_right_chance, eventJSON.until);
    for(const user of await Bets.getAllUsers()) {
        try {
            await sendEvents(user.telegram_id, [event]);
        } catch(e) {
            console.error(e);
        }
    }
    res.send("ok!");
});
app.post("/admin/events", async (req, res) => {
    if(!req.body.password || req.body.password != PASSWORD) return res.status(418).send("wrong password");
    const events = await Bets.getAllOngoingEvents();
    res.contentType("text/plain").send(events.map(x => `${x.id} ${x.description}

L ${x.outcome_left_chance} ${x.outcome_left}
R ${x.outcome_right_chance} ${x.outcome_right}
until ${new Date(x.until).toUTCString()}`).join("\n\n\n"));
});
app.post("/admin/finish", async (req, res) => {
    if(!req.body.password || req.body.password != PASSWORD) return res.status(418).send("wrong password");
    if(!req.body.id || !req.body.outcome || !["L", "R"].includes(req.body.outcome)) return res.status(400).send("bad request");
    const outcome = req.body.outcome == "L" ? 0 : 1;
    if(!await Bets.checkEvent(parseInt(req.body.id)))
        return res.status(400).send("event already closed");
    const event = await Bets.getEventByID(parseInt(req.body.id));
    if(!event) return res.status(500).send("error");
    const bets = await Bets.getBets(parseInt(req.body.id));
    for(const bet of bets) {
        try {
            if(bet.outcome == outcome) {
                const earned = Math.round(bet.amount / (outcome == 0 ? event.outcome_left_chance : event.outcome_right_chance));
                await Bets.addPointsToBalance(bet.by_user, earned);
                await bot.sendMessage((await Bets.getUserByID(bet.by_user)).telegram_id,
                    Strings.RIGHT_BET
                    .replace("[[event]]", event.description)
                    .replace("[[wrong]]", outcome == 0 ? event.outcome_right : event.outcome_left)
                    .replace("[[right]]", outcome == 0 ? event.outcome_left : event.outcome_right)
                    .replace("[[amount]]", earned))
            } else
                await bot.sendMessage((await Bets.getUserByID(bet.by_user)).telegram_id,
                    Strings.WRONG_BET
                    .replace("[[event]]", event.description)
                    .replace("[[wrong]]", outcome == 0 ? event.outcome_right : event.outcome_left)
                    .replace("[[right]]", outcome == 0 ? event.outcome_left : event.outcome_right))
        } catch(e) { console.error(e); }
    }
    await Bets.finishEvent(event.id);
    res.send("done");
});

app.listen(8055);