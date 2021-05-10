import { Collection, Db, MongoClient } from "mongodb";
import { mongo as conf } from "./config.json";
import { applog } from "./logger";
import { Artist, LogLevel, User } from "./types";

export class Mongo {
    private client: MongoClient;
    //@ts-ignore
    private artistCollection: Collection<Artist>;
    //@ts-ignore
    private userCollection: Collection<User>;

    constructor(uri: string) {
        this.client = new MongoClient(uri, { useUnifiedTopology: true });
    }

    public init() {
        return this.client.connect().then(() => {
            const db = this.client.db(conf.dbName);
            this.userCollection = db.collection(conf.userCollection);
            this.artistCollection = db.collection(conf.artistCollection);
        });
    }

    public async getUser(chatId: number) {
        applog("Requesting user from DB...", LogLevel.DEBUG, {chatId});
        return await this.userCollection.findOne({chatId: chatId})
        .then((user) => {
            if (user) applog("User found in DB", LogLevel.DEBUG, user);
            else applog("User not found in DB", LogLevel.DEBUG, {chatId});
            return user;
        });
    }

    public async getArtist(artistId: string) {
        applog("Requesting artist from DB...", LogLevel.DEBUG, {artistId});
        return await this.artistCollection.findOne({artistId: artistId})
        .then((artist) => {
            if (artist) applog("Artist found in DB", LogLevel.DEBUG, artist);
            else applog("Artist not found in DB", LogLevel.DEBUG, {artistId});
            return artist;
        });
    }

    public async updateRelease(artistId: string, releaseId: string) {
        applog("Saving release to DB...", LogLevel.DEBUG, {artistId, releaseId});
        return this.artistCollection.updateOne({artistId: artistId}, {$set: {latestReleaseId: releaseId}})
            .then(() => {
                applog("Release saved to DB", LogLevel.DEBUG, {artistId, releaseId});
            })
            .catch((reason) => {
                applog("Release not saved to DB", LogLevel.ERROR, {artistId, releaseId});
            });
    }

    public getArtists() {
        applog("Requesting artists cursor from DB...", LogLevel.DEBUG);
        return this.artistCollection.find();
    }

    public async addUser(chatId: number) {
        const date = new Date();
        const createdAt = date.toString();
        applog("Saving user to DB...", LogLevel.DEBUG, {chatId});
        return await this.userCollection.insertOne({chatId: chatId, subscriptions: [], createdAt: createdAt})
        .then((user) => {
            applog("User saved to DB", LogLevel.DEBUG, {chatId});
            return user
        })
        .then((user) => true, () => false);
    }

    public async addArtist(artistId: string, latestReleaseId: string) {
        applog("Saving artist to DB...", LogLevel.DEBUG, {artistId});
        return await this.artistCollection.insertOne({artistId: artistId, latestReleaseId: latestReleaseId, subscribedChatIds: []})
        .then((artist) => {
            applog("Artist saved to DB", LogLevel.DEBUG, {artistId});
            return artist;
        })
        .then((artist) => true, () => false);
    }

    public async removeUser(chatId: number) {
        applog("Removing user from DB...", LogLevel.DEBUG, {chatId});
        const user = await this.getUser(chatId);
        if (user) {
            applog("Unsubscribing user from artists...", LogLevel.DEBUG, {chatId, subscriptions: user.subscriptions});
            for (const artistId of user.subscriptions) {
                await this.unsubscribeUser(chatId, artistId);
            }
            applog("User unsibscribed from all artists", LogLevel.DEBUG, {chatId});
            const success = await this.userCollection.deleteOne({chatId: chatId});
            if (success.deletedCount && success.deletedCount > 0) {
                applog("User deleted from DB", LogLevel.ERROR, {chatId});
                return true;
            }
            
        } else {
            applog("Fail to delete user from DB. User not found", LogLevel.ERROR, {chatId});
            return false;
        }
    }

    public async unsubscribeUser(chatId: number, artistId: string) {
        applog("Deleting subscriptions from DB...", LogLevel.DEBUG, {chatId, artistId});
        const artist = await this.getArtist(artistId);
        const user = await this.getUser(chatId);
        if (!artist) {
            applog("Fail to unsubscribe user from Artist. Artist not found", LogLevel.ERROR, {chatId, artistId});
            return false;
        }
        if (!user) {
            applog("Fail to unsubscribe user from Artist. User not found", LogLevel.ERROR, {chatId, artistId});
            return false;
        }
        if (artist.subscribedChatIds.includes(chatId)) {
            const id = artist.subscribedChatIds.indexOf(chatId);
            artist.subscribedChatIds.splice(id, 1);
            if (artist.subscribedChatIds.length > 0) {
                this.artistCollection.updateOne({artistId: artist.artistId}, {$set: {subscribedChatIds: artist.subscribedChatIds}})
                .then(() => {
                    applog("User removed from artist subscribers", LogLevel.DEBUG, {chatId, artistId});
                });
            } else {
                this.artistCollection.deleteOne({artistId: artist.artistId})
                .then(() => {
                    applog("Last user removed from artist subscribers", LogLevel.INFO, {chatId, artistId});
                    applog("Artist deleted from DB", LogLevel.INFO, {artistId});
                });
            }
        } else {
            applog("User not found in Artist subscribers", LogLevel.ERROR, {chatId, artistId});
        }
        if (user.subscriptions.includes(artistId)) {
            const id = user.subscriptions.indexOf(artistId);
            user.subscriptions.splice(id, 1);
            this.userCollection.updateOne({chatId: chatId}, {$set: {subscriptions: user.subscriptions}})
            .then(() => {
                applog("Artist removed from user subscribtions", LogLevel.DEBUG, {chatId, artistId});
            });
        } else {
            applog("Artist not found in User subscribtions", LogLevel.ERROR, {chatId, artistId});
        };
        return true;
    }

    public async subscribeUser(chatId: number, artistId: string) {
        applog("Adding subscriptions to DB...", LogLevel.DEBUG, {chatId, artistId});
        const user = await this.getUser(chatId);
        const artist = await this.getArtist(artistId);
        if (!user) {
            applog("Fail to subscribe user to Artist. User not found", LogLevel.ERROR, {chatId, artistId});
            return false;
        }
        if (!artist) {
            applog("Fail to subscribe user to Artist. Artist not found", LogLevel.ERROR, {chatId, artistId});
            return false;
        }
        if (!user.subscriptions.includes(artistId)) {
            user.subscriptions.push(artistId);
            this.userCollection.updateOne({chatId: chatId}, {$set: {subscriptions: user.subscriptions}})
            .then(() => {
                applog("Artist added to user subscribtions", LogLevel.DEBUG, {chatId, artistId});
            });
        } else {
            applog("Artist already exists in User subscribtions", LogLevel.ERROR, {chatId, artistId});
        };
        if (!artist.subscribedChatIds.includes(chatId)) {
            artist.subscribedChatIds.push(chatId);
            this.artistCollection.updateOne({artistId: artist.artistId}, {$set: {subscribedChatIds: artist.subscribedChatIds}})
            .then(() => {
                applog("User added artist subscribers", LogLevel.DEBUG, {chatId, artistId});
            });;
        } else {
            applog("User already exists in Artist subscribers", LogLevel.ERROR, {chatId, artistId});
        };
        return true;
    }

}