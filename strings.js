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
    static CHOOSE_ACTION = "Выбери действие:";

    static BALANCE_IS = "Твой баланс:\n";

    static NEW_EVENT = "Событие:\n\n[[description]]\n[[outcome_left]] - [[outcome_left_chance]]%\n[[outcome_right]] - [[outcome_right_chance]]%\nДо [[until]]";
    static NO_EVENTS = "Сейчас событий нет :(";

    static ALREADY_PLACED = "У нас уже есть твоя ставка на это событие!";
    static EVENT_FINISHED = "Это событие уже закончилось!";

    static ENTER_BET = "Введи размер ставки:";
    static INVALID_BET = "Такое количество поставить нельзя!";
    static PLACED = "Ставка поставлена!";
    static CANCEL = "Отмена";
    static CANCELLED = "Отменено!";

    static RIGHT_BET = "Твоя ставка на событие [[event]] оказалась правильной!\n\nТвоя ставка: [[right]]\nНеправильно: [[wrong]]\n\nЗаработано [[amount]] баллов";
    static WRONG_BET = "Твоя ставка на событие [[event]] оказалась неправильной :(\n\nТвоя ставка: [[right]]\nПравильно: [[wrong]]";
}