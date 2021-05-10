import { spotify as spotyKeys, telegram as teleKey, mongo, releaseUpdateInterval } from "./config.json";
import { applog } from "./logger";
import { Mongo } from "./mongo";
import { Spotify } from "./spotify";
import { Telegram } from "./telegram";
import { AlbumInfo, Artist, LogLevel } from "./types";

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
            applog("Subscribing to Telegram events...", LogLevel.INFO);
            subscribeNewUser();
            subscribeBotBlocked();
            subscribeArtistAdded();
            subscribeArtistRemoved();
            applog("Subscribe to Telegram events succesfull", LogLevel.INFO);
            applog("App initialized", LogLevel.INFO);
            setInterval(() => {
                updateArtists();
            }, releaseUpdateInterval * 1000);
            applog("Update interval setup successful", LogLevel.INFO, {releaseUpdateInterval});
            updateArtists();
        });
    });
});

function updateArtists() {
    applog("Updating artists...", LogLevel.INFO);
    const artistIds: string[] = [];
    db.getArtists().forEach((artist) => {
        artistIds.push(artist.artistId);
    })
    .then(() => {
        applog("Got " + artistIds.length + " artists", LogLevel.DEBUG);
        spotify.getLatestAlbums(artistIds)
        .then((albums) => {
            applog("Got " + albums.length + " albums", LogLevel.DEBUG);
            if (albums.length != artistIds.length) applog("Requested and received albums do not match", LogLevel.ERROR, {requested: artistIds.length, received: albums.length});
            for (const album of albums) {
                db.getArtist(album.artistId)
                .then((artist) => {
                    if (artist) {
                        if (artist.latestReleaseId != album.albumId) {
                            applog("Got new release", LogLevel.INFO, album);
                            db.updateRelease(artist.artistId, album.albumId);
                            applog("Sending releases to users", LogLevel.DEBUG, {users: artist.subscribedChatIds});
                            for (const chatIds of artist.subscribedChatIds) {
                                telegram.sendRelease(chatIds, album.albumUrl);
                            }
                        } else {
                            applog("Artist latest release did not changed", LogLevel.DEBUG, {album});
                        }
                    } else {
                        applog("Requested artist does not exist", LogLevel.ERROR, {album});
                    }
                });
            }
        });
    });
}

function subscribeNewUser() {
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
}

function subscribeBotBlocked() {
    telegram.on("bot_blocked", (chatId) => {
        applog("Handling bot_blocked event...", LogLevel.DEBUG, {chatId});
        applog("Deleting user...", LogLevel.DEBUG, {chatId});
        db.removeUser(chatId)
        .then((success) => {
            if (success) applog("User deleted", LogLevel.INFO, {chatId});
            else applog("Fail to delete user", LogLevel.ERROR, {chatId});
        });
    });
}

function subscribeArtistAdded() {
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
                applog("New artist detected", LogLevel.DEBUG, {artistId});
                spotify.getNewArtist(artistId)
                .then((result) => {
                    if (result) {
                        applog("New artist received", LogLevel.DEBUG, result);
                        db.addArtist(result.artistId, result.albumId)
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
}

function subscribeArtistRemoved() {
    telegram.on('artist_removed', (chatId, artistId) => {
        applog("Handling artist_removed event...", LogLevel.DEBUG, {chatId, artistId});
        db.unsubscribeUser(chatId, artistId)
        .then((success) => {
            if (success) applog("User unsubscribed from artist", LogLevel.INFO, {chatId, artistId});
            else applog("Fail to unsubscribe user from artist", LogLevel.ERROR, {chatId, artistId});
            telegram.commandReply(chatId, 'remove', success);
        });
    });
}