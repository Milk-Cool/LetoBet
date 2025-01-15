import sqlite3 from "sqlite3";

const db = new sqlite3.Database(process.env.DATABASE_PATH ?? "data.db");

/**
 * @typedef {object} User
 * @property {number} id - The unique identifier for the user
 * @property {string} username - The username of the user
 * @property {number} telegram_id - The Telegram ID of the user
 * @property {number} balance - The balance of the user
 * @property {number} last - The last activity timestamp of the user
 */

/**
 * @typedef {object} Event
 * @property {number} id - The unique identifier for the event
 * @property {string} description - The event description
 * @property {string} outcome_left - The description of the left outcome
 * @property {number} outcome_left_chance - The chance of the left outcome
 * @property {string} outcome_right - The description of the right outcome
 * @property {number} outcome_right_chance - The chance of the right outcome
 * @property {number} until - Epoch in ms when the event ends
 */

/**
 * @typedef {object} Bet
 * @property {number} id - The unique identifier for the bet
 * @property {number} event_id - The event ID
 * @property {number} by_user - The ID of the user who placed the bet
 * @property {0 | 1} outcome - The outcome of the bet (0 for left, 1 for right)
 * @property {number} amount - The size of the bet
 */


const adb = (func, query, params) => new Promise((resolve, reject) => {
    db[func](query, params ?? [], (err, res) => {
        if(err) reject(err);
        else resolve(res);
    });
});
adb.get = (query, params) => adb("get", query, params);
adb.all = (query, params) => adb("all", query, params);
adb.run = (query, params) => adb("run", query, params);

let tableInit = false;

(async () => {
    await adb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        telegram_id INTEGER,
        balance INTEGER,
        last INTEGER
    )`);
    await adb.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY,
        description TEXT,
        outcome_left TEXT,
        outcome_left_chance REAL,
        outcome_right TEXT,
        outcome_right_chance REAL,
        until INTEGER
    )`);
    await adb.run(`CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY,
        event_id INTEGER,
        by_user INTEGER,
        outcome INTEGER,
        amount INTEGER
    )`); // where outcome is 0 or 1, where 0 is left and 1 is right
    tableInit = true;
})();

export function waitForInit() {
    return new Promise(resolve => {
        const f = () => tableInit ? resolve() : setTimeout(f);
        setTimeout(f);
    });
}

/**
 * Creates a user.
 * 
 * @param {string} username Letovo username
 * @param {number} telegram_id Telegram user ID
 */
export async function createUser(username, telegram_id) {
    await adb.run(`INSERT INTO users (username, telegram_id, balance, last) VALUES (?, ?, 0, 0)`, [username, telegram_id]);
}

/**
 * Gets all users.
 * 
 * @returns {User[]} The users
 */
export async function getAllUsers() {
    return await adb.all(`SELECT * FROM users`);
}

/**
 * Gets a user by their ID.
 * 
 * @param {number} id ID
 * @returns {User} The user
 */
export async function getUserByID(id) {
    return await adb.get(`SELECT * FROM users WHERE id = ?`, [id]);
}

/**
 * Gets a user by their Telegram ID.
 * 
 * @param {number} telegram_id Telegram user ID
 * @returns {User} The user
 */
export async function getUserByTelegramID(telegram_id) {
    return await adb.get(`SELECT * FROM users WHERE telegram_id = ?`, [telegram_id]);
}

/**
 * Gets a user by their username.
 * 
 * @param {string} username Letovo username
 * @returns {User} The user
 */
export async function getUserByUsername(username) {
    return await adb.get(`SELECT * FROM users WHERE username = ?`, [username]);
}

/**
 * Updates a user's balance.
 * 
 * @param {string} username Letovo username
 * @param {number} newLast New balance
 */
export async function updateUserBalance(username, newLast) {
    const user = await getUserByUsername(username);
    if(!user) return;
    await adb.run(`UPDATE users SET balance = ?, last = ? WHERE id = ?`, [user.balance + newLast - user.last, newLast, user.id]);
}

/**
 * Adds diploma points to a user's balance.
 * 
 * @param {number} id User ID
 * @param {number} points User points
 */
export async function addPointsToBalance(id, points) {
    await adb.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [points, id]);
}

/**
 * Deducts diploma points from a user's balance.
 * 
 * @param {number} id User ID
 * @param {number} points User points
 */
export async function deductPointsFromBalance(id, points) {
    await adb.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [points, id]);
}

/**
 * Creates an event.
 * 
 * @param {string} description The event description
 * @param {string} outcome_left The left outcome
 * @param {number} outcome_left_chance The left outcome's chance in (0, 1)
 * @param {string} outcome_right The right outcome
 * @param {number} outcome_right_chance The right outcome's chance in (0, 1)
 * @param {Date} until The closing date
 * @returns {Event} THe created event
 */
export async function createEvent(description, outcome_left, outcome_left_chance, outcome_right, outcome_right_chance, until) {
    await adb.run(`INSERT INTO events (description, outcome_left, outcome_left_chance, outcome_right, outcome_right_chance, until)
        VALUES (?, ?, ?, ?, ?, ?)`, [description, outcome_left, outcome_left_chance, outcome_right, outcome_right_chance, until.getTime()]);
    return await adb.get("SELECT * FROM events ORDER BY id DESC LIMIT 1");
}

/**
 * Gets all ongoing events.
 * 
 * @returns {Event[]} Ongoing events
 */
export async function getAllOngoingEvents() {
    let events = await adb.all(`SELECT * FROM events WHERE until >= ?`, [new Date().getTime()]);
    events = events.map(x => {
        x.until = new Date(x.until);
        return x;
    });
    return events;
}

/**
 * Checks if the event is still ongoing.
 * 
 * @param {number} id The event ID
 * @returns {boolean} Whether you can bet on the event right now
 */
export async function checkEvent(id) {
    return (await adb.all(`SELECT * FROM events WHERE until >= ? AND id = ?`, [new Date().getTime(), id])).length > 0;
}

/**
 * Gets a bet on a specific event by a specific user.
 * 
 * @param {number} telegram_id Telegram ID
 * @param {number} event_id Event ID
 * @returns {Bet} The bet
 */
export async function getBet(telegram_id, event_id) {
    const user = await getUserByTelegramID(telegram_id);
    if(!user) return false;
    return await adb.get(`SELECT * FROM bets WHERE by_user = ? AND event_id = ?`, [user.id, event_id]);
}

/**
 * Gets all bets on a specific event.
 * 
 * @param {number} event_id Event ID
 * @returns {Bet[]} The bets
 */
export async function getBets(event_id) {
    return await adb.all(`SELECT * FROM bets WHERE event_id = ?`, [event_id]);
}

/**
 * Places a bet.
 * 
 * @param {number} telegram_id Telegram ID
 * @param {number} event_id Event ID
 * @param {0 | 1} outcome The outcome (0 = left, 1 = right)
 * @param {number} amount The amount of points to place
 */
export async function placeBet(telegram_id, event_id, outcome, amount) {
    const user = await getUserByTelegramID(telegram_id);
    if(!user) return;
    await adb.run(`INSERT INTO bets (event_id, by_user, outcome, amount) VALUES (?, ?, ?, ?)`, [event_id, user.id, outcome, amount]);
}