import { Collection, Db, MongoClient } from "mongodb";
import { mongo as conf } from "./config.json";
import { Artist, User } from "./types";

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
        return await this.userCollection.findOne({chatId: chatId});
    }

    public async getArtist(artistId: string) {
        return await this.artistCollection.findOne({artistId: artistId});
    }

    public async updateRelease(artistId: string, releaseId: string) {
        const artist = await this.getArtist(artistId);
        if (artist) {
            return await this.artistCollection.updateOne({artistId: artistId}, {$set: {latestReleaseId: releaseId}})
            .then(() => true);
        } else {
            return false;
        }
    }

    public getArtists() {
        return this.artistCollection.find();
    }

    public async addUser(chatId: number) {
        return await this.userCollection.insertOne({chatId: chatId, subscriptions: []})
        .then((user) => true, () => false);
    }

    public async addArtist(artistId: string, latestReleaseId: string) {
        return await this.artistCollection.insertOne({artistId: artistId, latestReleaseId: latestReleaseId, subscribedChatIds: []})
        .then((artist) => true, () => false);
    }

    public async removeUser(chatId: number) {
        const user = await this.getUser(chatId);
        if (user) {
            for (const artistId of user.subscriptions) {
                await this.unsubscribeUser(chatId, artistId);
            }
            return true;
        } else return false;
    }

    public async unsubscribeUser(chatId: number, artistId: string) {
        const artist = await this.getArtist(artistId);
        if (artist) {
            if (artist && artist.subscribedChatIds.includes(chatId)) {
                const id = artist.subscribedChatIds.indexOf(chatId);
                artist.subscribedChatIds.splice(id, 1);
                if (artist.subscribedChatIds.length > 0) {
                    this.artistCollection.updateOne({artistId: artist.artistId}, {$set: {subscribedChatIds: artist.subscribedChatIds}});
                } else {
                    this.artistCollection.deleteOne({artistId: artist.artistId});
                }
                const user = await this.getUser(chatId);
                if (user && user.subscriptions.includes(artistId)) {
                    const id = user.subscriptions.indexOf(artistId);
                    user.subscriptions.splice(id, 1);
                    this.userCollection.updateOne({chatId: chatId}, {$set: {subscriptions: user.subscriptions}});
                    return true;
                } else return false;
            } else return false;
        } else return false;
    }

    public async subscribeUser(chatId: number, artistId: string) {
        const user = await this.getUser(chatId);
        if (user) {
            if (user && !user.subscriptions.includes(artistId)) {
                user.subscriptions.push(artistId);
                this.userCollection.updateOne({chatId: chatId}, {$set: {subscriptions: user.subscriptions}});
                const artist = await this.getArtist(artistId);
                if (artist && !artist.subscribedChatIds.includes(chatId)) {
                    artist.subscribedChatIds.push(chatId);
                    this.artistCollection.updateOne({artistId: artist.artistId}, {$set: {subscribedChatIds: artist.subscribedChatIds}});
                    return true;
                } else return false;
            } else return true;
        } else return false;
    }

}