import { CachedItem, ResponseCache, isExpired, DefaultCachedItem } from '../src/Cache';
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

    cache.setValue(key1, new DefaultCachedItem(apiRepsonse, new Date(), 2));

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
    const cacheItem = new DefaultCachedItem(apiRepsonse, dateNowBefore2Sec, 3);
    expect(isExpired(cacheItem)).toBeFalsy();

    const expiredItem = new DefaultCachedItem(apiRepsonse, dateNowBefore2Sec, 2);
    expect(isExpired(expiredItem)).toBeTruthy();

    const neverExpired = new DefaultCachedItem(apiRepsonse, new Date(Date.now() - 10000), null);
    expect(isExpired(neverExpired)).toBeFalsy();

    const neverExpired2 = new DefaultCachedItem(apiRepsonse, new Date(Date.now() - 1000), 0);
    expect(isExpired(neverExpired2)).toBeFalsy();
});