import { LogLevel } from "./types";
import { logLevel as currentLevel } from "./config.json"


export function applog(message: string, logLevel: LogLevel, object?: Object) {
    if (logLevel <= currentLevel) {
        let log = console.log;
        let text = "";
        switch (logLevel) {
            case LogLevel.DEBUG:
                text = "DEBUG: " + message;
                break;
            case LogLevel.INFO:
                text = "INFO: " + message;
                break;
            case LogLevel.WARNING:
                text = "WARNING: " + message;
                break;
            case LogLevel.ERROR:
                log = console.error;
                text = "ERROR: " + message;
                break;
            default:
                throw "ERROR: unknown log level";
        }
        if (object) {
            text += ". Object: ";
            log(text, object);
        } else {
            log(text);
        }
    }
}