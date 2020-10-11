import { LogLevel } from "./LogLevel";

export class Logger {

    private static instance: Logger;
    private level: LogLevel;

    private constructor(level: LogLevel = 'info') {
        this.level = level;        
    }

    public static getLogger() {
        return this.createLogger();
    }

    public static createLogger(level: LogLevel = 'info') {
        if (!this.instance) {
            return new Logger(level);
        }
        return this.instance;
    }

    public log(level, msg) {
        try {
            /*
             We're going to log objects on a separate line. Most good browsers will log the object with
             all it's properties if we do it that way.
             */
            if (typeof msg == 'object') {
                console.log(level + ':');
                console.log(msg);
            } else {
                console.log(level + ': ' + msg);
            }
        } catch (ex) {
            //do nothing
        }
    };

    public info(msg) {
        if (this.level === 'info') this.log('INFO', msg);
    }
    
    public debug(msg) {
        if (this.level === 'debug') this.log('DEBUG', msg);
    }
    
    error(msg) {
        this.log('ERROR', msg);
    } 

}