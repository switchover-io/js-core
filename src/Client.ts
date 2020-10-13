import { Emitter } from "./Emitter";
import { Fetcher } from "./Fetcher";
import { Options } from "./Options";
import { Logger } from "./util/Logger";
import { LogLevel } from "./util/LogLevel";
import { ResponseCache } from './Cache';
import { Evaluator } from "./Evaluator";
import deepEqual = require('fast-deep-equal');

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
    
    /**
     * Loaded event will be triggered, after client was successfully initialized
     * 
     * @param cb 
     */
    onLoaded(cb: () => void) {
        this.emitter.on('loaded', cb);
    }

    /**
     * Updated event will be triggered when toggles where changed and Auto-Refresh is enabled.
     * 
     * Manually calling forceRefresh() can also trigger the update event.
     * 
     * @param cb 
     */
    onUpdated(cb: (changed) => void) {
        this.emitter.on('updated', cb);
    }


    /**
     * Evaluates a feature toggle with given name, returns the default value when evaluation 
     * was not successfull.
     *
     * @param name 
     * @param context 
     * @param defaultValue 
     * 
     */
    active(name: string, context = null, defaultValue = false) {
        const { payload } = this.cache.getValue(this.sdkKey);
        return this.evaluator.evaluate(payload, name, context, defaultValue);
    }

    /*
    getValue(name:string, defaultValue) {
        const { payload } = this.cache.getValue(this.sdkKey);
        if (!payload) {
            throw new Error('No features loaded! Did you wait for init?');
        }
        return payload.find( t => t.name === name)?.value;
    }*/


    /**
     * Forces a refresh. This eventually can trigger an update event if toggles changed 
     * or never been loaded to the cache.
     */
    forceRefresh() {

        const { lastModified, payload } = this.cache.getValue(this.sdkKey);
        const oldCacheResult = payload;

        this.fetcher.fetchAll(this.sdkKey, lastModified).then( result => {

            //check also the lastModified value 
            if (result && result.lastModified !== lastModified) {

                //get changed toggles
                let changed = result.payload.map(t => t.name);
                if (oldCacheResult) {
                    changed = result.payload.filter( resultToggle => {
                        const cachedToggle = oldCacheResult.find( ot => ot.name === resultToggle.name);
                        return !deepEqual(cachedToggle, resultToggle);
                    }).map( t => t.name );
                } 

                //fill cache
                this.cache.setValue(this.sdkKey, result);

                //emit loaded event
                this.emitter.emit('updated', changed) //, changed);
            }
        }).catch(err => {
            this.logger.error(err);
            this.logger.error(`Failed to load. Server sent ${err.status} ${err.text}`);
        });
    }

    /**
     * (Re-) Starts auto refresh when you enabled the option.
     */
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
    
    /**
     * Stops auto-refresh. You can start againt with startPolling()
     */
    stopPolling() {
        if (this.pollHandle) {
            this.logger.debug('Stop polling');
            clearInterval(this.pollHandle);
        }
    }

}