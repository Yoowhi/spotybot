import { Collection, Db, MongoClient } from "mongodb";
import { mongo as conf } from "./config.json";
import { Artist, User } from "./types";

export class Mongo {
    private uri: string;
    private client: MongoClient;
    private db: Db | undefined;
    private artistCollection: Collection<Artist>;
    private userCollection: Collection<User>;

    constructor(uri: string) {
        this.uri = uri;
        this.client = new MongoClient(uri, { useUnifiedTopology: true });

        this.db = this.client.db(conf.dbName);
        this.userCollection = this.db.collection(conf.userCollection);
        this.artistCollection = this.db.collection(conf.artistCollection);
    }

    public init() {
        return this.client.connect().then(() => {
            this.db = this.client.db(conf.dbName);
            this.userCollection = this.db.collection(conf.userCollection);
            this.artistCollection = this.db.collection(conf.artistCollection);
        });
    }

    public async getUser(chatId: number) {
        return await this.userCollection.findOne({chatId: chatId});
    }

    public async getArtist(artistId: string) {
        return await this.artistCollection.findOne({artistId: artistId});
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
                delete artist.subscribedChatIds[id];
                if (artist.subscribedChatIds.length > 0) {
                    this.artistCollection.updateOne({artistId: artist.artistId}, {$set: {subscribedChatIds: artist.subscribedChatIds}});
                } else {
                    this.artistCollection.deleteOne({artistId: artist.artistId});
                }
                const user = await this.getUser(chatId);
                if (user && user.subscriptions.includes(artistId)) {
                    const id = user.subscriptions.indexOf(artistId);
                    delete user.subscriptions[id];
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
            } else return false;
        } else return false;
    }

}