import { spotify as spotyKeys, telegram as teleKey, mongo } from "./config.json";
import { applog } from "./logger";
import { Mongo } from "./mongo";
import { Spotify } from "./spotify";
import { Telegram } from "./telegram";
import { LogLevel } from "./types";

applog("App started", LogLevel.INFO);
const spotify = new Spotify(spotyKeys.clientId, spotyKeys.clientSecret);
const telegram = new Telegram(teleKey);
const db = new Mongo(mongo.uri);
applog("Initializing Spotify...", LogLevel.INFO);
spotify.init().then(() => {
    applog("Spotify initialized", LogLevel.INFO);
    applog("Initializing Telegram...", LogLevel.INFO);
    telegram.init().then(() => {
        applog("Telegram initialized", LogLevel.INFO);
        applog("Initializing MongoDB...", LogLevel.INFO);
        db.init().then(() => {
            applog("MongoDB initialized", LogLevel.INFO);
            applog("Subscribing to Telegram events...", LogLevel.DEBUG);
            telegram.on("new_user", (chatId) => {
                applog("Handling new_user event...", LogLevel.DEBUG, {chatId});
                db.getUser(chatId)
                .then((user) => {
                    if (!user) {
                        applog("New user detected", LogLevel.INFO, {chatId});
                        db.addUser(chatId)
                        .then((success) => {
                            if (success) applog("New user added to DB", LogLevel.DEBUG, {chatId});
                            else applog("Fail to add user to DB", LogLevel.ERROR, {chatId});
                        });
                    } else {
                        applog("User already exists", LogLevel.WARNING, {chatId});
                    }
                });
                telegram.welcomeUser(chatId);
            });
            telegram.on("bot_blocked", (chatId) => {
                applog("Handling bot_blocked event...", LogLevel.DEBUG, {chatId});
                applog("Deleting user...", LogLevel.DEBUG, {chatId});
                db.removeUser(chatId)
                .then((success) => {
                    if (success) applog("User deleted", LogLevel.INFO, {chatId});
                    else applog("Fail to delete user", LogLevel.ERROR, {chatId});
                });
            });
            telegram.on('artist_added', (chatId, artistId) => {
                applog("Handling artist_added event...", LogLevel.DEBUG, {chatId, artistId});
                db.getArtist(artistId)
                .then((artist) => {
                    if (artist) {
                        applog("Subscribing user to artist...", LogLevel.DEBUG, {chatId, artistId});
                        db.subscribeUser(chatId, artistId)
                        .then((success) => {
                            if (success) applog("User subscribed to artist", LogLevel.INFO, {chatId, artistId});
                            else applog("Fail to subscribe user to artist", LogLevel.ERROR, {chatId, artistId});
                            telegram.commandReply(chatId, 'add', success);
                        });
                    } else {
                        applog("Artist not found", LogLevel.DEBUG, {artistId});
                        applog("Requesting new artist from Spotify...", LogLevel.DEBUG, {artistId});
                        spotify.getNewArtist(artistId)
                        .then((result) => {
                            if (result) {
                                applog("New artist received", LogLevel.DEBUG, result);
                                db.addArtist(result.artistId, result.albumUrl)
                                .then((success) => {
                                    if (success) {
                                        applog("New artist added", LogLevel.INFO, {artistId});
                                        db.subscribeUser(chatId, artistId)
                                        .then((success) => {
                                            if (success) applog("User subscribed to artist", LogLevel.INFO, {chatId, artistId});
                                            else applog("Fail to subscribe user to artist", LogLevel.ERROR, {chatId, artistId});
                                            telegram.commandReply(chatId, 'add', true);
                                        });
                                    } else {
                                        applog("Fail to add new artist", LogLevel.ERROR, result);
                                        telegram.commandReply(chatId, 'add', false);
                                    }
                                });
                            } else {
                                applog("Can not find artist in Spotify", LogLevel.DEBUG, {artistId});
                                telegram.commandReply(chatId, 'add', false);
                            }
                        });
                    }
                })
            });
            telegram.on('artist_removed', (chatId, artistId) => {
                applog("Handling artist_removed event...", LogLevel.DEBUG, {chatId, artistId});
                db.unsubscribeUser(chatId, artistId)
                .then((success) => {
                    if (success) applog("User unsubscribed from artist", LogLevel.INFO, {chatId, artistId});
                    else applog("Fail to unsubscribe user from artist", LogLevel.ERROR, {chatId, artistId});
                    telegram.commandReply(chatId, 'remove', success);
                });
            });
            applog("Subscribe to Telegram events succesfull", LogLevel.DEBUG);
        });
    });
});