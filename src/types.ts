export type AlbumInfo = { artistId: string, albumId: string, albumUrl: string };
export type BotCommand = "add" | "remove" | "help";
export type BotCommandData = { artistName?: string };

export type User = { chatId: number, subscriptions: string[] };
export type Artist = { artistId: string, latestReleaseId: string, subscribedChatIds: number[]};