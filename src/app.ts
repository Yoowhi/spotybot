import { spotify as spotyKeys, telegram as teleKey, mongo } from "./config.json";
import { Mongo } from "./mongo";
import { Spotify } from "./spotify";
import { Telegram } from "./telegram";

const spotify = new Spotify(spotyKeys.clientId, spotyKeys.clientSecret);
const telegram = new Telegram(teleKey);
const db = new Mongo(mongo.uri);
spotify.init().then(() => {
    telegram.init().then(() => {
        db.init().then(() => {
            db.getArtists().then((cursor) => {
                cursor?.forEach((artist) => {
                    artist.
                })
            })
            telegram.on("new_user", (chatId) => {
                db.addUser(chatId).then((success) => console.log("User added: " + success + ", " + chatId));
            });
            telegram.on("bot_blocked", (chatId) => {
                db.removeUser(chatId).then((success) => console.log("User removed: " + success + ", " + chatId));
            });

        });
    });
});