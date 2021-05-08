import SpotifyWebApi from "spotify-web-api-node";
import { spotify as spotyKeys } from "./keys.json";
import { Spotify } from "./spotify";

const spotify = new Spotify(spotyKeys.clientId, spotyKeys.clientSecret);
spotify.init().then(() => {
    
});