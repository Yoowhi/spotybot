import { userInfo } from "os";
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
            telegram.on("new_user", (chatId) => {
                db.getUser(chatId)
                .then((user) => {
                    if (!user) {
                        db.addUser(chatId);
                    }
                });
                telegram.welcomeUser(chatId);
            });
            telegram.on("bot_blocked", (chatId) => {
                db.removeUser(chatId);
            });
            telegram.on('artist_added', (chatId, artistId) => {
                db.getArtist(artistId)
                .then((artist) => {
                    if (artist) {
                        db.subscribeUser(chatId, artistId)
                        .then((success) => {
                            telegram.commandReply(chatId, 'add', success);
                        });
                    } else {
                        spotify.getNewArtist(artistId)
                        .then((result) => {
                            if (result) {
                                db.addArtist(result.artistId, result.albumUrl)
                                .then((success) => {
                                    telegram.commandReply(chatId, 'add', success);
                                });
                            } else {
                                telegram.commandReply(chatId, 'add', false);
                            }
                        });
                    }
                })
            });
            telegram.on('artist_removed', (chatId, artistId) => {
                db.unsubscribeUser(chatId, artistId)
                .then((success) => {
                    telegram.commandReply(chatId, 'remove', success);
                });
            });
        });
    });
});