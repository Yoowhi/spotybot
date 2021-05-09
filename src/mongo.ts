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

    public async addUser(chatId: number) {
        return await this.userCollection.insertOne({chatId: chatId, subscriptions: []}).then(() => true, () => false);
    }

    public async getUser(chatId: number) {
        return await this.userCollection.findOne({chatId: chatId});
    }

    public async removeUser(chatId: number) {
        return await this.getUser(chatId).then((user) => {
            if (user) {
                for (const artistId of user.subscriptions) {
                    this.removeArtistFromUser(chatId, artistId);
                }
            }
        });
    }

    public async artistExists(artistId: string) {
        return await this.artistCollection.findOne({artistId: artistId}).then((artist) => {
            return !!artist;
        });
    }

    public async addArtistToUser(chatId: number, artistId: string) {
        return await this.userCollection.updateOne({chatId: chatId}, {$push: {subscriptions: artistId}}).then(() => true, () => false);
    }

    public async getArtists() {
        return await this.artistCollection.find({});
    }

    public async getArtist(artistId: string) {
        return await this.artistCollection.findOne({artistId: artistId});
    }

    public async updateArtist(artistId: string, latestReleaseId: string) {
        return await this.artistCollection.updateOne({artistId: artistId}, {$set: {latestReleaseId: latestReleaseId}}).then(() => true, () => false);
    }

    public async removeArtistFromUser(chatId: number, artistId: string) {
        return await this.getUser(chatId).then((user) => {
            if (user) {
                if (user.subscriptions.includes(artistId)) {
                    this.getArtist(artistId).then((artist) => {
                        if (artist) {
                            if (artist.subscribedChatIds.includes(chatId)) {
                                delete user.subscriptions[user.subscriptions.indexOf(artistId)];
                                this.userCollection.updateOne({chatId: chatId}, {subscriptions: user.subscriptions})
                                .then(() => {
                                    delete artist.subscribedChatIds[artist.subscribedChatIds.indexOf(chatId)];
                                    this.artistCollection.updateOne({artistId: artistId}, {subscribedChatIds: artist.subscribedChatIds});
                                });
                            } else {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    })
                } else {
                    return false;
                }
            } else {
                return false;
            }
        });
    }

    // removeArtistFromUser: (userId: number, artistId: string) => Promise<boolean>;

}