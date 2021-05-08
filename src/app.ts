import SpotifyWebApi from "spotify-web-api-node";
import { Telegraf } from "telegraf";
import { spotify as spotyKeys, telegram as teleKey } from "./keys.json";
import { Spotify } from "./spotify";
import { Telegram } from "./telegram";

const spotify = new Spotify(spotyKeys.clientId, spotyKeys.clientSecret);
const telegram = new Telegram(teleKey);
spotify.init().then(() => {
    telegram.init().then(() => {
        
    });
});