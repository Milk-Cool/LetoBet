process.env.DATABASE_PATH = ":memory:";

let Bets = {};
test("inits the module", async () => {
    Bets = await import("./index.js");
    await Bets.waitForInit();
});

const username = "2028test.tt";
const tgid = 123456789;

test("creates a valid user", async () => {
    await Bets.createUser(username, tgid);
    const user = (await Bets.getAllUsers())[0];
    expect(await Bets.getUserByUsername(username)).toEqual(user);
    expect(await Bets.getUserByTelegramID(tgid)).toEqual(user);
});

test("updates a user's balance", async () => {
    let user = (await Bets.getAllUsers())[0];
    await Bets.updateUserBalance(username, 25);
    await Bets.addPointsToBalance(user.id, 30);
    await Bets.updateUserBalance(username, 100);
    await Bets.deductPointsFromBalance(user.id, 50);
    user = await Bets.getUserByID(user.id);
    expect(user.last).toBe(100);
    expect(user.balance).toBe(80);
});

const description = "Mokrinskiy will die of Ligma";
const until = new Date(999999999999999);
const outcomeLeft = "Will die of ligma";
const outcomeLeftChance = 0.2;
const outcomeRight = "Will NOT die of ligma";
const outcomeRightChance = 0.8;

test("creates a valid event", async () => {
    await Bets.createEvent(description, outcomeLeft, outcomeLeftChance, outcomeRight, outcomeRightChance, until);
    const event = (await Bets.getAllOngoingEvents())[0];

    expect(event.description).toBe(description);
    expect(event.outcome_left).toBe(outcomeLeft);
    expect(event.outcome_left_chance).toBe(outcomeLeftChance);
    expect(event.outcome_right).toBe(outcomeRight);
    expect(event.outcome_right_chance).toBe(outcomeRightChance);
    expect(event.until).toBe(until.getTime());
    expect(await Bets.checkEvent(event.id)).toBe(true);
});

const outcome = 0;
test("places a valid bet", async () => {
    let user = (await Bets.getAllUsers())[0];
    const event = (await Bets.getAllOngoingEvents())[0];

    await Bets.placeBet(user.telegram_id, event.id, outcome);
    const bet = await Bets.getBet(user.telegram_id, event.id);
    expect(bet.event_id).toBe(event.id);
    expect(bet.by_user).toBe(user.id);
    expect(bet.outcome).toBe(outcome);
});