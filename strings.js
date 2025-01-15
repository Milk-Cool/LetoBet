const { ADMIN } = process.env;

export class Strings {
    static HELLO = `Привет!\nЭтот бот позволяет ставить баллы Диплома Летово на события в школе.\nНажми кнопку ниже, чтобы войти!\n\nНе доверяешь? Посмотри исходный код! https://github.com/Milk-Cool/LetoBet или свяжись с админом ${ADMIN}`;
    
    static LOGGING_IN = "Входим...";
    static LOGGED_IN = "Вошли!";
    static WRONG_CREDENTIALS = "Неверные данные :(";
    static ALREADY_LOGGED_IN = `Под твоим аккаунтом уже вошли! Если считаешь, что это ошибка, напиши ${ADMIN}`;
}