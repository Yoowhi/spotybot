export type AlbumInfo = { artistId: string, albumId: string, albumUrl: string };
export type BotCommand = "add" | "remove" | "help";
export type BotCommandData = { artistName?: string };