import { Emitter } from "./Emitter";
import { Fetcher } from "./Fetcher";
import { Options } from "./Options";
import { Logger } from "./util/Logger";
import { LogLevel } from "./util/LogLevel";
import { ResponseCache } from './Cache';
import { Evaluator } from "./Evaluator";

export class Client {

    private logger: Logger;
    private emitter: Emitter;
    private cache: ResponseCache
    private fetcher: Fetcher;
    private evaluator: Evaluator;
    private pollHandle: any;

    sdkKey: string;
    options: Options


    constructor(
            evaluator: Evaluator,
            emitter: Emitter,
            cache: ResponseCache,
            fetcher: Fetcher,
            sdkKey: string, 
            options: Options, 
            level: LogLevel) {

        this.evaluator = evaluator;
        this.emitter = emitter;
        this.cache = cache;
        this.fetcher = fetcher;
        this.sdkKey = sdkKey;
        this.options = options

        this.logger = Logger.createLogger(level);

        this.logger.debug('created client, initaliziang...');

        this.fetcher.fetchAll(this.sdkKey).then( apiResponse => {
            this.logger.debug('Fetch all config on client initialization');

            //fill cache
            this.cache.setValue(sdkKey, apiResponse);
            //emit loaded event
            this.emitter.emit('loaded');

            this.logger.debug('Loaded config');
        } )

        this.initPolling();
    }
    
    onLoaded(cb: () => void) {
        this.emitter.on('loaded', cb);
    }

    onUpdated(cb: () => void) {
        this.emitter.on('updated', cb);
    }

    active(name: string, context = null, defaultValue = false) {
        const { payload } = this.cache.getValue(this.sdkKey);
        return this.evaluator.evaluate(payload, name, context, defaultValue);
    }


    forceRefresh() {

        const { lastModified, payload } = this.cache.getValue(this.sdkKey);

        this.fetcher.fetchAll(this.sdkKey, lastModified).then( result => {

            if (result){ //TODO && result.lastModified !== lastModified) {

                //check also the lastModified value 

                //fill cache
                this.cache.setValue(this.sdkKey, result);

                //emit loaded event
                this.emitter.emit('updated');
            }
        }).catch(err => {
            this.logger.error(err);
            this.logger.error(`Failed to load. Server sent ${err.status} ${err.text}`);
        });
    }

    initPolling() {
        if (this.options.autoRefresh) {
            this.logger.debug('Init AutoRefresh...')
            let interval = this.options.refreshRate;
            if (!interval) {
                this.logger.debug('AutoRefresh activated, no interval set, using default');
                interval = 60;
            }
            this.logger.debug('Init polling with interval=' + interval);
            this.pollHandle = setInterval(() => {
                this.forceRefresh();
            }, interval * 1000);

        }
    }
    

    stopPolling() {
        if (this.pollHandle) {
            this.logger.debug('Stop polling');
            clearInterval(this.pollHandle);
        }
    }

}