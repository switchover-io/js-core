import { Emitter } from "./Emitter";
import { Fetcher } from "./Fetcher";
import { Options } from "./Options";
import { Logger } from "./util/Logger";
import { LogLevel } from "./util/LogLevel";
import { ResponseCache } from './Cache';
import { Evaluator } from "./Evaluator";
import * as equal from 'fast-deep-equal';
import { ApiResponse } from "./ApiResponse";

const deepEqual = equal.default;
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

        this.logger.debug('Created client');
        
        this.initOptionListeners();

        this.initPolling();
    }

    /**
     * Indicates if cached is filled, e.g after first fetch
     */
    isCacheFilled() {
        const response = this.cache.getValue(this.sdkKey);
        return response != null;
    }


    /**
     * Initially Fetches all toggles from server and then fetch from cache. Callback will be triggerd when fetching is done.
     *
     * @param cb
     */
    fetch(cb: () => void) {
        if (!this.cache.getValue(this.sdkKey)) {
            this.fetcher.fetchAll(this.sdkKey).then(apiResponse => {
                this.logger.debug('Fetch all config on client initialization');

                //fill cache
                this.cache.setValue(this.sdkKey, apiResponse);

                this.logger.debug('Loaded config');

                cb();
            });
        } else {
            this.logger.debug('Fetched from cache');
            cb();
        }
    }


    /**
     * Fetch as promise
     */
    fetchAsync() : Promise<void> {
        return new Promise( (resolve, _) => {
            this.fetch( () => resolve() );
        })
    }

    private initOptionListeners() {
        if (this.options.onUpdate) {
            this.onUpdate(this.options.onUpdate);
        }
    }


    /**
     * Updated event will be triggered when toggles where changed and Auto-Refresh is enabled.
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

    /**
     * Manually refreshes toggles. If toggles were updated, callback will hold the changed toggle keys.
     * If nothing has changed, keys are null.
     *
     * @param cb
     */
    refresh(cb: (keys: string[]) => void) {
        this.doRefresh(cb);
    }

    /**
     * Refreshes async
     */
    refreshAsync() : Promise<string[]> {
        return new Promise( (resolve, _) => {
            this.doRefresh( keys => resolve(keys) )
        });
    }

    private doRefresh(cb: (keys: string[]) => void) {
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

                cb(changed);
            } else {
                cb(null);
            }
        }).catch(err => {
            this.logger.error(err);
            this.logger.error(`Failed to load. Server sent ${err.status} ${err.text}`);
            cb(null);
        });
    }

    /**
     * Forces a refresh. This eventually can trigger an update event if toggles changed
     * or never been loaded to the cache.
     * 
     * @deprecated
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
                this.logger.debug('AutoRefresh activated using default');
                interval = 60;
            }
            this.logger.debug('Init polling with interval=' + interval);
            this.pollHandle = setInterval(() => {
                this.pollAndNotifyOnUpdates();
            }, interval * 1000);
        }
    }

    private pollAndNotifyOnUpdates() {
        this.doRefresh((changedKeys) => {
            if (changedKeys) {
                //emit loaded event
                this.emitter.emit('updated', changedKeys) //, changed);
            }
        });
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