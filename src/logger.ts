import { LogLevel } from "./types";


export function applog(message: string, logLevel: LogLevel, object?: Object) {
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