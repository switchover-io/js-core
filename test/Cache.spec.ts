import { ResponseCache } from '../src/Cache';
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

    cache.setValue(key1, apiRepsonse);

    expect(cache.getValue(key1)).toEqual(apiRepsonse);
    expect(cache.getValue(key1).lastModified).toEqual(apiRepsonse.lastModified);
    expect(cache.getValue('no_such_key')).toBeUndefined();
})