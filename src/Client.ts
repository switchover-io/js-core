import { Emitter } from "./Emitter";
import { Fetcher } from "./Fetcher";
import { Options } from "./Options";
import { Logger } from "./util/Logger";
import { LogLevel } from "./util/LogLevel";
import { CachedItem, ResponseCache } from './Cache';
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

    //TODO "lastCachedItem" for async cache

    private lastCachedItem: CachedItem;

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
        return this.lastCachedItem && this.lastCachedItem.item != null; // && !response.isExpired();
    }


    /**
     * Initially Fetches all toggles from server and then fetch from cache. Callback will be triggerd when fetching is done.
     *
     * @param cb
     */
    fetch(cb: () => void) {
        const _this = this;
        this.fetchFromCache().then( value => {
            let cached = value;

            if (cached && cached.isExpired()) {
                cached = null;
            }

            if (!cached) {
                this.fetcher.fetchAll(this.sdkKey).then( apiResponse => {
                    _this.logger.debug('Fetch all config on client initialization');

                    const cachedItem = new CachedItem(apiResponse, new Date(), this.options.ttl);

                    _this.lastCachedItem = cachedItem;

                    //fill cache
                    _this.cache.setValue(this.sdkKey, cachedItem);
    
                    _this.logger.debug('Loaded config');
                    cb();
                })
            } else {
                _this.logger.debug('Fetched from cache');
                _this.lastCachedItem = cached;
                cb(); 
            }
        }).catch( err => {
            this.logger.error('Something went wrong: ' + err);
            cb();
        });
    } 


    private fetchFromCache() : Promise<CachedItem> {
        return new Promise( resolve => resolve(this.cache.getValue(this.sdkKey)));
    }


    /**
     * Fetch as promise
     */
    fetchAsync(): Promise<void> {
        return new Promise((resolve, _) => {
            this.fetch(() => resolve());
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
        const cachedItem = this.lastCachedItem;
        const { payload } = cachedItem ? cachedItem.item : { payload: null };
        // const { payload } = this.cache.getValue(this.sdkKey) || { lastModified: null, payload: null };
        return this.evaluator.evaluate(payload, name, context, defaultValue).value;
    }


    /**
     * Returns a varation id for given toggle name, if evaluation fails, it will return the given default variation id.
     *
     * Note: Variation ids will be often used in combination with rollout options (percentual-rollout, a/b-split). You can use
     * the variation id to track user
     *
     * @param name 
     * @param defaultVariationId 
     * @param context 
     */
    getVariationId(name: string, defaultVariationId, context = {}) {
        const cachedItem = this.cache.getValue(this.sdkKey);
        const { payload } = cachedItem ? cachedItem.item : { payload: null };
        return this.evaluator.evaluate(payload, name, context, null, defaultVariationId).variationId;
    }

    getVariationsIds() {
        const cachedItem = this.cache.getValue(this.sdkKey);
        if (cachedItem && cachedItem.item) {
            return cachedItem.item.payload
                .filter(toggle => toggle.conditions)
                .flatMap(toggle => {
                    return toggle.conditions.filter(cond => cond.allocations)
                        .flatMap(cond => cond.allocations.map(alloc => {
                            return {
                                toggleName: toggle.name,
                                variationId: alloc.name
                            }
                        }))
                });
        }
        return [];
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
    refreshAsync(): Promise<string[]> {
        return new Promise((resolve, _) => {
            this.doRefresh(keys => resolve(keys))
        });
    }

    private doRefresh(cb: (keys: string[]) => void) {

        const _this = this;
        this.fetchFromCache().then(value => {

            const cachedItem = value;

            let lastModified = null;
            let oldCacheResult = null;
            if (cachedItem) { // && !cachedItem.isExpired()) {
                lastModified = cachedItem.item.lastModified;
                oldCacheResult = cachedItem.item.payload
            }

            _this.fetcher.fetchAll(_this.sdkKey, lastModified).then(result => {

                //check also the lastModified value
                if (result && result.lastModified !== lastModified) {

                    //get changed toggles
                    let changed = _this.getChangedKeys(result, oldCacheResult);

                    const cachedItem = new CachedItem(result, new Date(), _this.options.ttl);

                    _this.lastCachedItem = cachedItem;

                    //fill cache
                    _this.cache.setValue(_this.sdkKey, cachedItem);

                    cb(changed);
                } else {
                    cb(null);
                }
            }).catch(err => {
                _this.logger.error(err);
                _this.logger.error(`Failed to load. Server sent ${err.status} ${err.text}`);
                cb(null);
            });
        });
    } 

    private getChangedKeys(result: ApiResponse, oldCacheResult: any) {
        if (oldCacheResult) {
            return result.payload.filter(resultToggle => {
                const cachedToggle = oldCacheResult.find(ot => ot.name === resultToggle.name);
                return !deepEqual(cachedToggle, resultToggle);
            }).map(t => t.name);
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
        const cached = this.cache.getValue(this.sdkKey);
        const cachedResponse = cached ? cached.item : null;
        if (this.hasCachedResonse(cachedResponse)) {
            return cachedResponse.payload.map(t => t.name);
        }
        return [];
    }

    private hasCachedResonse(response: ApiResponse) {
        return response && response.payload;
    }


}