import { CachedItem, ResponseCache } from '../src/Cache';
import { MemoryCache } from '../src/MemoryCache';

test('set and get cache', () => {
    const cache: ResponseCache = new MemoryCache();

    const key1 = 'key1';
    const apiRepsonse = {
        lastModified: 'Sun, 04 Oct 2020 20:42:27 GMT',
        payload: {
            some_toggles: { }
        }
    }

    cache.setValue(key1, new CachedItem(apiRepsonse, new Date(), 2));

    const item = cache.getValue(key1).item;

    expect(item).toEqual(apiRepsonse);
    expect(item.lastModified).toEqual(apiRepsonse.lastModified);
    expect(cache.getValue('no_such_key')).toBeUndefined();
})

test('test CacheItem isExpired', () => {

    const apiRepsonse = {
        lastModified: 'Sun, 04 Oct 2020 20:42:27 GMT',
        payload: {
            some_toggles: { }
        }
    }

    const dateNowBefore2Sec = new Date(Date.now() - 2000);
    const cacheItem = new CachedItem(apiRepsonse, dateNowBefore2Sec, 3);
    expect(cacheItem.isExpired()).toBeFalsy();

    const expiredItem = new CachedItem(apiRepsonse, dateNowBefore2Sec, 2);
    expect(expiredItem.isExpired()).toBeTruthy();

    const neverExpired = new CachedItem(apiRepsonse, new Date(Date.now() - 10000), null);
    expect(neverExpired.isExpired()).toBeFalsy();

    const neverExpired2 = new CachedItem(apiRepsonse, new Date(Date.now() - 1000), 0);
    expect(neverExpired2.isExpired()).toBeFalsy();
});