export type AlbumInfo = { artistId: string, albumId: string, albumUrl: string };
export type BotCommand = "add" | "remove" | "help";

export type User = { chatId: number, subscriptions: string[], createdAt: string };
export type Artist = { artistId: string, latestReleaseId: string, subscribedChatIds: number[]};

export enum LogLevel {
    ERROR,
    WARNING,
    INFO,
    DEBUG
}