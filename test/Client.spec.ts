import { Client } from '../src/Client';
import { Evaluator } from '../src/Evaluator';
import { EventEmitter } from '../src/Emitter';
import { MemoryCache } from '../src/MemoryCache';
import { ResponseCache } from '../src/Cache';
import { Fetcher } from '../src/Fetcher';
import { mocked } from 'ts-jest/utils'
import { ApiResponse } from '../src/ApiResponse';
import { convertCompilerOptionsFromJson } from 'typescript';
import { Logger } from '../src/util/Logger';




const mockFetcher = {
    fetchAll: jest.fn()
}

const response1: ApiResponse = {
    lastModified: '1',
    payload: [{
        name: "toggle1",
        status: "4",
        strategy: "3",
        conditions: [],
        value: true
    }]
};

beforeEach(() => {
    mockFetcher.fetchAll.mockClear();
})


test('Test fetch', done => {

    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation(() => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        cache, mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    client.fetch(() => {
        try {
            expect(mockFetcher.fetchAll).toBeCalledTimes(1);
            expect(cache.getValue(sdkKey).item.lastModified).toEqual(response1.lastModified);
            //done();
        } catch (error) {
            done(error)
        }
    });

    //cache should not expire (we did not provide a ttl) and fetch all should not be called again
    setTimeout(() => {
        client.fetch(() => {
            expect(mockFetcher.fetchAll).toBeCalledTimes(1);
            done();
        })
    }, 2000)
});

test('Test fetch with ttl 2sec', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation(() => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        cache, mockFetcher,
        sdkKey, { autoRefresh: false, ttl: 2 }, 'info');

    client.fetch(() => {
        try {
            expect(mockFetcher.fetchAll).toBeCalledTimes(1);
            expect(cache.getValue(sdkKey).ttl).toEqual(2);
            //done();
        } catch (error) {
            done(error)
        }
    });

    setTimeout(() => {
        expect(cache.getValue(sdkKey).isExpired()).toBeTruthy();
        //fetch again
        client.fetch(() => {
            expect(mockFetcher.fetchAll).toBeCalledTimes(2);
            done();
        })

    }, 3000); //After 3 seconds the cache should be expired



})

test('Test fetchAsync', async () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation(() => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        cache, mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    await client.fetchAsync();

    expect(mockFetcher.fetchAll).toBeCalledTimes(1);
    expect(cache.getValue(sdkKey).item.lastModified).toEqual(response1.lastModified);
})

test('Test isCachedFilled', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation(() => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey,
        { autoRefresh: false },
        'info');

    expect(client.isCacheFilled()).toBeFalsy();

    client.fetch(() => {
        try {
            expect(client.getToggleKeys()).toHaveLength(1);

            expect(client.isCacheFilled()).toBeTruthy();

            done();
        } catch (error) {
            done(error);
        }
    })
})

test('Test onUpdate with auto-refresh interval 2s', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation(() => Promise.resolve(response1));

    function onUpdateCallback(keys) {
        try {
            expect(keys).toHaveLength(1);
            expect(keys[0]).toBe('toggle1');
            expect(client.getToggleKeys()).toHaveLength(1);
            client.stopPolling();
            done();
        } catch (error) {
            done(error);
        }
    }

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey,
        {
            refreshInterval: 2,
            autoRefresh: true,
            onUpdate: onUpdateCallback
        },
        'info');
})


test('Test refresh with new toggles on update', done => {
    const sdkKey = 'some_key'

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    const response2 = {
        lastModified: '2',
        payload: [
            {
                name: "toggle1",
                status: "4",
                strategy: "3",
                conditions: []
            },
            {
                name: "toggle2",
                status: "4",
                strategy: "3",
                conditions: []
            }]
    }
    mockFetcher.fetchAll.mockImplementationOnce(() => Promise.resolve(response2));

    client.refresh((changed) => {
        try {
            expect(changed).toHaveLength(2);
            expect(changed[0]).toEqual('toggle1');
            expect(changed[1]).toEqual('toggle2');
            done();
        } catch (error) {
            done(error);
        }
    })

})

test('Test refreshAsync', async () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementationOnce(() => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    const keys = await client.refreshAsync();
    expect(keys).toHaveLength(1);

    //2nd time should be null
    const keys2 = await client.refreshAsync();
    expect(keys2).toBeNull();
})


test('Test refreshAsync with changed keys', async () => {
    const sdkKey = 'some_key'

    const initialResponse = {
        lastModified: '1',
        payload: [{
            name: "toggle1",
            status: 1,
            strategy: "3",
            value: true,
            conditions: []
        }]
    }

    const changedResponse = {
        lastModified: '2',
        payload: [{
            name: "toggle1",
            status: 4,
            strategy: "3",
            conditions: []
        }]
    }

    const myFetcher = {
        fetchAll: jest.fn()
    }
    myFetcher.fetchAll
        .mockImplementationOnce(() => Promise.resolve(initialResponse))
        .mockImplementationOnce(() => Promise.resolve(changedResponse));

    const cache = new MemoryCache();
    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        cache,
        myFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    const keys1 = await client.refreshAsync();
    expect(keys1[0]).toEqual('toggle1');
    expect(cache.getValue(sdkKey).item.lastModified).toEqual("1");

    expect(client.toggleValue('toggle1',false)).toBeTruthy();
    
    const keys2 = await client.refreshAsync();
    expect(myFetcher.fetchAll).toHaveBeenCalledTimes(2);
    expect(cache.getValue(sdkKey).item.lastModified).toEqual("2");
    expect(keys2[0]).toEqual('toggle1');
});


test('Client toggleValue should return default value if not init', () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementationOnce(() => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    expect(client.toggleValue('toggle1', true)).toBeTruthy();
    expect(client.toggleValue('toggle29391', false)).toBeFalsy();
})


test('Client variationId should return value for percentual rollout', async () => {
    const sdkKey = 'some_key'

    const variationResponse: ApiResponse =
    {
        lastModified: "1",
        payload: [{
            name: "toggle-001",
            status: 1,
            value: 1,
            strategy: 1,
            conditions: [
                {
                    key: "key01",
                    name: "rollout-condition",
                    allocations: [{
                        name: "BucketA",
                        value: 10,
                        ratio: 0.5
                    },
                    {
                        name: "BucketB",
                        value: 20,
                        ratio: 0.5
                    }]
                }
            ]
        }]
    }

    const otherFetcher = {
        fetchAll: jest.fn()
    }

    otherFetcher.fetchAll.mockImplementationOnce(() => Promise.resolve(variationResponse));


    const client = new Client(
        new Evaluator(Logger.createLogger("debug")),
        new EventEmitter(),
        new MemoryCache(),
        otherFetcher,
        sdkKey, { autoRefresh: false }, 'debug');

    await client.fetchAsync();

    console.log(client.getToggleKeys());

    const variation = client.getVariationId("toggle-001", "Control", { uuid: 1 });
    expect(variation).toEqual("BucketA");

    const variation2 = client.getVariationId("toggle-001", "Control", { uuid: 4 });
    expect(variation2).toEqual("BucketB");

    expect(client.getVariationsIds()).toHaveLength(2);
})

test('Test async cache', async () => {
   
    const sdkKey = 'some_key'

    let _cache = {};
    let myAsyncMemoryCache = function () {}

    myAsyncMemoryCache.prototype.setValue = async (key, value) => {
        _cache[key] = value;
    };

    myAsyncMemoryCache.prototype.getValue = async (key) => {
        return await _cache[key];
    };


    const client = new Client(
        new Evaluator(Logger.createLogger("debug")),
        new EventEmitter(),
        new myAsyncMemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'debug');

    await client.fetchAsync();

    expect(client.isCacheFilled()).toBeTruthy();

    const value = client.toggleValue('toggle1', false);

    expect(value).toBeFalsy();

})