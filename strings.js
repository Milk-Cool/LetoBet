const { ADMIN } = process.env;

export class Strings {
    static HELLO = `Привет!\nЭтот бот позволяет ставить баллы Диплома Летово на события в школе.\nНажми кнопку ниже, чтобы войти!\nМы не храним никакие твои данные, кроме юзернейма и баллов диплома.\nНе доверяешь? Посмотри исходный код! https://github.com/Milk-Cool/LetoBet или свяжись с админом ${ADMIN}`;
    static LOG_IN_BUTTON = "Войти";

    static LOGGING_IN = "Входим...";
    static LOGGED_IN = "Вошли!";
    static WRONG_CREDENTIALS = "Неверные данные :(";
    static ALREADY_LOGGED_IN = `Под твоим аккаунтом уже вошли! Если считаешь, что это ошибка, напиши ${ADMIN}`;
    static UPDATED_BALANCE = "Обновили баланс!";

    static ALL_EVENTS = "Все события";
    static BALANCE = "Проверить баланс";
    static UPDATE_BALANCE = "Обновить баланс";
    static CHOOSE_ACTION = "Выберите действие:";

    static BALANCE_IS = "Твой баланс:\n";

    static NEW_EVENT = "Новое событие!\n\n[[description]]\n[[outcome_left]] - [[outcome_left_chance]]%\n[[outcome_right]] - [[outcome_right_chance]]%\nДо [[until]]";
    static NO_EVENTS = "Сейчас событий нет :(";
}