import EventEmitter from "events";
import { Telegraf } from "telegraf";
import { applog } from "./logger";
import * as BotMessages from "./strings.json";
import { BotCommand, LogLevel } from "./types";

interface TelegramEvents {
    'new_user': (chatId: number) => void;
    'bot_blocked': (chatId: number) => void;
    'artist_added': (chatId: number, artistId: string) => void;
    'artist_removed': (chatId: number, artistId: string) => void;
  }

export declare interface Telegram {
    on<U extends keyof TelegramEvents>(
      event: U, listener: TelegramEvents[U]
    ): this;
  
    emit<U extends keyof TelegramEvents>(
      event: U, ...args: Parameters<TelegramEvents[U]>
    ): boolean;
  }



export class Telegram extends EventEmitter {
    private bot: Telegraf;

    constructor(token: string) {
        super();
        this.bot = new Telegraf(token);
        this.bot.start((ctx) => {
            this.emit('new_user', ctx.chat.id);
        });
        this.initCommands();
        this.bot.on('message', (ctx) => {
            //@ts-ignore
            const message = ctx.message.text;
            applog("Got new message", LogLevel.DEBUG, {chatid: ctx.chat.id, message: message});
            const artistId = this.parseUrl(message);
            if (artistId) {
                applog("artistId parsed", LogLevel.DEBUG, {artistId: artistId, chatid: ctx.chat.id});
                this.emit("artist_added", ctx.chat.id, artistId);
            } else {
                applog("artistId not parsed", LogLevel.DEBUG, {chatid: ctx.chat.id, message: message});
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.catch((error) => {
            applog("Telegram API exception", LogLevel.ERROR, {error});
        });
    }

    public init() {
        return this.bot.launch();
    }

    public commandReply(chatId: number, command: BotCommand, success: boolean) {
        applog("Replying to user", LogLevel.DEBUG, {chatId, command, success});
        switch (command) {
            case 'add':
                if (success) this.sendMessage(chatId, BotMessages.artist_added);
                else this.sendMessage(chatId, BotMessages.cant_add_artist);
                break;
            case 'remove':
                if (success) this.sendMessage(chatId, BotMessages.artist_removed);
                else this.sendMessage(chatId, BotMessages.cant_remove_artist);
                break;
            default:
                break;
        }
    }

    public welcomeUser(chatId: number) {
        applog("Welcoming new user", LogLevel.DEBUG, {chatId});
        this.bot.telegram.sendMessage(chatId, BotMessages.welcome);
        this.bot.telegram.sendMessage(chatId, BotMessages.controls);
    }

    public sendRelease(chatId: number, url: string) {
        this.sendMessage(chatId, url)
        .then(() => {
            applog("Release sent to user", LogLevel.DEBUG, {chatId, releaseUrl: url});
        });
    }

    private sendMessage(chatId: number, text: string) {
        return this.bot.telegram.sendMessage(chatId, text)
        .then((message) => {
            applog("Message sent to user", LogLevel.DEBUG, {chatId, messageId: message.message_id});
        })
        .catch((reason) => {
            if (reason.description == "Forbidden: bot was blocked by the user") {
                applog("Bot was blocked by user", LogLevel.DEBUG, chatId);
                this.emit('bot_blocked', chatId)
            } else {
                applog("Telegram API error while sending message", LogLevel.ERROR, reason);
            }
        });
    }

    private initCommands() {
        this.bot.command('add', (ctx) => {
            const message = ctx.message.text;
            applog("Command /add received", LogLevel.DEBUG, {chatId: ctx.chat.id, text: message});
            const artistId = this.parseUrl(message);
            if (artistId) {
                applog("artistId parsed", LogLevel.DEBUG, {artistId: artistId, chatid: ctx.chat.id});
                this.emit("artist_added", ctx.chat.id, artistId);
            } else {
                applog("artistId not parsed", LogLevel.DEBUG, {chatid: ctx.chat.id, message: message});
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.command('remove', (ctx) => {
            const message = ctx.message.text;
            applog("Command /remove received", LogLevel.DEBUG, {chatId: ctx.chat.id, text: message});
            const artistId = this.parseUrl(message);
            if (artistId) {
                applog("artistId parsed", LogLevel.DEBUG, {artistId: artistId, chatid: ctx.chat.id});
                this.emit("artist_removed", ctx.chat.id, artistId);
            } else {
                applog("artistId not parsed", LogLevel.DEBUG, {chatid: ctx.chat.id, message: message});
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.command('help', (ctx) => {
            applog("Command /help received", LogLevel.DEBUG, {chatId: ctx.chat.id});
            ctx.reply(BotMessages.controls);
        });
    }

    private parseUrl(text: string): string | false {
        const chunks = text.split(/\s/);
        for (let chunk of chunks) {
            if (chunk.startsWith("https://open.spotify.com/artist/")) {
                chunk = chunk.replace("https://open.spotify.com/artist/", "");
                const artistId = chunk.split("?", 1)[0] ?? false;
                return artistId;
            }
        }
        return false;
    }
}