import EventEmitter from "events";
import { Telegraf } from "telegraf";
import * as BotMessages from "./strings.json";
import { BotCommand } from "./types";

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
            const artistId = this.parseUrl(message);
            if (artistId) {
                this.emit("artist_added", ctx.chat.id, artistId);
            } else {
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.catch((error) => {
            // TODO Error
        });
    }

    public init() {
        return this.bot.launch();
    }

    public commandReply(chatId: number, command: BotCommand, success: boolean) {
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
        this.bot.telegram.sendMessage(chatId, BotMessages.welcome);
        this.bot.telegram.sendMessage(chatId, BotMessages.controls);
    }

    private sendMessage(chatId: number, text: string) {
        this.bot.telegram.sendMessage(chatId, text)
        .catch((reason) => {
            if (reason.description == "Forbidden: bot was blocked by the user") {
                this.emit('bot_blocked', chatId)
            } else {
                throw reason;
            }
        });
    }

    private initCommands() {
        this.bot.command('add', (ctx) => {
            const message = ctx.message.text;
            const artistId = this.parseUrl(message);
            if (artistId) {
                this.emit("artist_added", ctx.chat.id, artistId);
            } else {
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.command('remove', (ctx) => {
            const message = ctx.message.text;
            const artistId = this.parseUrl(message);
            if (artistId) {
                this.emit("artist_removed", ctx.chat.id, artistId);
            } else {
                ctx.reply(BotMessages.url_parse_failed);
            }
        });
        this.bot.command('help', (ctx) => {
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