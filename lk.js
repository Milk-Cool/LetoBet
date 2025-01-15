// Code taken from another unreleased project
import { JSDOM } from "jsdom";

/**
 * Authenticates a user.
 * 
 * @param {stirng} username The username
 * @param {string} password The password
 * @return {string} The PHPSESSID token
 */
export async function auth(username, password) {
    const fCsrf = await fetch("https://student.letovo.ru/login");
    const cookies = fCsrf.headers.getSetCookie();
    const phpsessid = cookies.find(x => x.includes("PHPSESSID=")).match(/(?<=PHPSESSID=)[a-zA-Z0-9]+/)[0];
    const tCsrf = await fCsrf.text();
    const csrf = tCsrf.match(/(?<=_token( )*:( )*('|"))[a-zA-Z0-9]+/)[0];
    
    // Logging in
    await fetch("https://student.letovo.ru/login", {
        "method": "POST",
        "body": (new URLSearchParams({
            "_token": csrf,
            "login": username,
            "password": password
        })).toString(),
        "headers": {
            "X-Csrf-Token": csrf,
            "Cookie": "PHPSESSID=" + phpsessid,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });

    // Those are necessary!
    await fetch("https://student.letovo.ru/home", {
        "headers": {
            "Cookie": "PHPSESSID=" + phpsessid,
            "Referer": "https://student.letovo.ru/student/academic/diary"
        }
    });

    await fetch("https://student.letovo.ru/index.php?r=student&part_student=diary", {
        "headers": {
            "Cookie": "PHPSESSID=" + phpsessid,
            "Referer": "https://student.letovo.ru/student/academic/diary"
        }
    });

    return phpsessid;
}

/**
 * Gets the sum of all Letovo diploma points.
 * 
 * @param {stirng} phpsessid The PHPSESSID
 * @returns {number} The total amount of Letovo diploma points
 */
export async function diplomaPoints(phpsessid) {
    const f = await fetch("https://student.letovo.ru/?r=student&part_student=diplom", {
        "headers": {
            "Cookie": "PHPSESSID=" + phpsessid
        }
    });
    const t = await f.text();
    const { window } = new JSDOM(t, { contentType: "text/html" });
    const els = Array.from(window.document.querySelectorAll(".container tbody > tr > td.c:nth-last-child(1)"));
    if(els.length == 0) throw new Error("Invalid page!");
    return els.map(x => parseInt(x.textContent)).reduce((a, b) => a + b, 0);
}