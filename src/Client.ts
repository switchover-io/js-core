import { Emitter } from "./Emitter";
import { Fetcher } from "./Fetcher";
import { Options } from "./Options";
import { Logger } from "./util/Logger";
import { LogLevel } from "./util/LogLevel";
import { ResponseCache } from './Cache';
import { Evaluator } from "./Evaluator";
import equal from 'fast-deep-equal';
import { ApiResponse } from "./ApiResponse";

const deepEqual = equal;
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

        this.initOptionListeners();

        this.fetcher.fetchAll(this.sdkKey).then( apiResponse => {
            this.logger.debug('Fetch all config on client initialization');

            //fill cache
            this.cache.setValue(sdkKey, apiResponse);
            //emit loaded event
            this.emitter.emit('loaded');

            this.logger.debug('Loaded config');
        })

        this.initPolling();
    }
    
    


    private initOptionListeners() {
        if (this.options.onInit) {
            this.onInit(this.options.onInit);
        }
        if (this.options.onUpdate) {
            this.onUpdate(this.options.onUpdate);
        }
    }

    /**
     * Loaded event will be triggered, after client was successfully initialized
     * 
     * @param cb 
     */
    onInit(cb: () => void) {
        this.emitter.on('loaded', cb);
    }

    /**
     * Updated event will be triggered when toggles where changed and Auto-Refresh is enabled.
     *
     * Manually calling forceRefresh() can also trigger the update event.
     *
     * @param cb
     */
    onUpdate(cb: (keys: string[]) => void) {
        this.emitter.on('updated', cb);
    }

    /**
     * Returns a toggle value by given namen.
     *
     * It will return the given default value:
     * - When toggle is INACTIVE
     * - When evalution fails
     * - When client was not fully initialized
     *
     * Context can hold properties which want to be evaluated against conditions if you have any set.
     *
     * @param name
     * @param context
     * @param defaultValue
     *
     */
    toggleValue(name: string, defaultValue, context = {}) {
        const { payload } = this.cache.getValue(this.sdkKey) || { lastModified: null, payload: null };
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

        const { lastModified, payload } = this.cache.getValue(this.sdkKey) || {
            lastModified: null,
            payload: null
        };
        const oldCacheResult = payload;

        this.fetcher.fetchAll(this.sdkKey, lastModified).then( result => {

            //check also the lastModified value
            if (result && result.lastModified !== lastModified) {

                //get changed toggles
                let changed = this.getChangedKeys(result, oldCacheResult);

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

    private getChangedKeys(result: ApiResponse, oldCacheResult: any) {
        if (oldCacheResult) {
            return result.payload.filter( resultToggle => {
                const cachedToggle = oldCacheResult.find( ot => ot.name === resultToggle.name);
                return !deepEqual(cachedToggle, resultToggle);
            }).map( t => t.name );
        }
        return result.payload.map(t => t.name);
    }

    /**
     * (Re-) Starts auto refresh when you enabled the option.
     */
    initPolling() {
        if (this.options.autoRefresh) {
            this.logger.debug('Init AutoRefresh...')
            let interval = this.options.refreshInterval;
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

    /**
     * Get all toggle keys, which currently loaded
     */
    getToggleKeys() {
        const cachedResponse = this.cache.getValue(this.sdkKey);
        if (this.hasCachedResonse(cachedResponse)) {
            return cachedResponse.payload.map( t => t.name);
        }
        return [];
    }

    private hasCachedResonse(response: ApiResponse) {
        return response && response.payload;
    }


}