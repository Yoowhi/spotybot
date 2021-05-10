import SpotifyWebApi from "spotify-web-api-node";
import { applog } from "./logger";
import { AlbumInfo, LogLevel } from "./types";


export class Spotify {
    private api: SpotifyWebApi;

    constructor(clientId: string, clientSecret: string) {
        this.api = new SpotifyWebApi({
            clientId: clientId,
            clientSecret: clientSecret
        });
        
    }

    public init() {
        applog("Requesting Spotify access token...", LogLevel.INFO);
        return this.api.clientCredentialsGrant()
        .then((data) => {
            applog("Spotify access token granted", LogLevel.INFO, {type: data.body.token_type, expires: data.body.expires_in});
            applog("Setting up Spotify access token", LogLevel.DEBUG);
            this.api.setAccessToken(data.body.access_token);
            const tokenInteval = (data.body.expires_in - 60) * 1000;
            setInterval(() => {
                applog("Updating Spotify access token...", LogLevel.INFO);
                this.api.clientCredentialsGrant().then((data) => {
                    applog("Spotify access token granted", LogLevel.INFO, {type: data.body.token_type, expires: data.body.expires_in});
                    applog("Setting up Spotify access token", LogLevel.DEBUG);
                    this.api.setAccessToken(data.body.access_token);
                })
                .catch((error) => {
                    applog("Spotify API error while requesting token", LogLevel.ERROR, {error});
                });
            }, tokenInteval);
        })
        .catch((error) => {
            applog("Spotify API error while requesting token", LogLevel.ERROR, {error});
        });
    }

    public async getLatestAlbums(artistIds: string[]): Promise<AlbumInfo[]> {
        applog("Requesting artist albums...", LogLevel.DEBUG);
        const result: AlbumInfo[] = [];
        for (const id of artistIds) {
            await this.api.getArtistAlbums(id, {limit: 1})
            .then((data) => {
                applog("Got album info", LogLevel.DEBUG, {artistId: id, albumId: data.body.items[0].id});
                result.push({
                    artistId: id,
                    albumId: data.body.items[0].id,
                    albumUrl: data.body.items[0].external_urls.spotify
                });
            })
            .catch((error) => {
                applog("Spotify API error while requesting album", LogLevel.ERROR, {artistId: id, error});
            });
        }
        applog("Artist albums received", LogLevel.DEBUG);
        return result;
    }

    public async getNewArtist(artistId: string) {
        applog("Requesting new artist...", LogLevel.DEBUG, {artistId});
        return await this.api.getArtistAlbums(artistId, {limit: 1})
        .then((data) => {
            applog("Got album info", LogLevel.DEBUG, {artistId, albumId: data.body.items[0].id});
            return {
                artistId: artistId,
                albumId: data.body.items[0].id,
                albumUrl: data.body.items[0].external_urls.spotify
            }
        })
        .catch((error) => {
            applog("Spotify API error while requesting new artist", LogLevel.ERROR, {artistId, error});
        });
    }
}