const { ADMIN } = process.env;

export class Strings {
    static HELLO = `Привет!\nЭтот бот позволяет ставить баллы Диплома Летово на события в школе.\nНажми кнопку ниже, чтобы войти!\nМы не храним никакие твои данные, кроме юзернейма и баллов диплома.\nНе доверяешь? Посмотри исходный код! https://github.com/Milk-Cool/LetoBet или свяжись с админом ${ADMIN}`;
    static LOG_IN_BUTTON = "Войти";
    
    static LOGGING_IN = "Входим...";
    static LOGGED_IN = "Вошли!";
    static WRONG_CREDENTIALS = "Неверные данные :(";
    static ALREADY_LOGGED_IN = `Под твоим аккаунтом уже вошли! Если считаешь, что это ошибка, напиши ${ADMIN}`;
}