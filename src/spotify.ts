import SpotifyWebApi from "spotify-web-api-node";
import { AlbumInfo } from "./types";


export class Spotify {
    private api: SpotifyWebApi;

    constructor(clientId: string, clientSecret: string) {
        this.api = new SpotifyWebApi({
            clientId: clientId,
            clientSecret: clientSecret
        });
        
    }

    public init() {
        return this.api.clientCredentialsGrant()
        .then((data) => {
            this.api.setAccessToken(data.body.access_token);
            const tokenInteval = (data.body.expires_in - 60) * 1000;
            setInterval(() => {
                this.api.clientCredentialsGrant().then((data) => {
                    this.api.setAccessToken(data.body.access_token);
                }, (error) => {
                    // TODO Error
                })
                .catch((reason) => {
                    // TODO Error
                });
            }, tokenInteval);
        }, (error) => {
            // TODO Error
        })
        .catch((reason) => {
            // TODO Error
        });
    }

    public async getLatestAlbums(artistIds: string[]): Promise<AlbumInfo[]> {
        const result: AlbumInfo[] = [];
        for (const id of artistIds) {
            await this.api.getArtistAlbums(id, {limit: 1})
            .then((data) => {
                result.push({
                    artistId: id,
                    albumId: data.body.items[0].id,
                    albumUrl: data.body.items[0].external_urls.spotify
                });
            }, (error) => {
                // TODO Error
            })
            .catch((reason) => {
                // TODO Error
            });
        }
        return result;
    }

    public async getNewArtist(artistId: string) {
        return await this.api.getArtistAlbums(artistId, {limit: 1})
        .then((data) => {
            return {
                artistId: artistId,
                albumId: data.body.items[0].id,
                albumUrl: data.body.items[0].external_urls.spotify
            }
        })
        .catch((reason) => {
            return null;
        });
    }
}