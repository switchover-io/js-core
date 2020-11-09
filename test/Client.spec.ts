import { Client } from '../src/Client';
import { Evaluator } from '../src/Evaluator';
import { EventEmitter } from '../src/Emitter';
import { MemoryCache } from '../src/MemoryCache';
import { ResponseCache } from '../src/Cache';
import { Fetcher } from '../src/Fetcher';
import { mocked } from 'ts-jest/utils'
import { ApiResponse } from '../src/ApiResponse';
import { convertCompilerOptionsFromJson } from 'typescript';




const mockFetcher = {
    fetchAll: jest.fn()
}

const response1:ApiResponse = {
    lastModified: '1',
    payload: [{
        name: "toggle1",
        status: "4",
        strategy: "3",
        conditions: []
    }]
};

beforeEach(()=> {
    mockFetcher.fetchAll.mockClear();
})


test('Test fetch', done => {

    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
            new Evaluator(),
            new EventEmitter(),
            cache, mockFetcher,
            sdkKey, { autoRefresh: false }, 'info');

    client.fetch( () => {
        try {
            expect(mockFetcher.fetchAll).toBeCalledTimes(1);
            expect(cache.getValue(sdkKey).lastModified).toEqual(response1.lastModified);
            done();
        } catch(error) {
            done(error)
        }
    });

      
});

test('Test fetchAsync', async () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
            new Evaluator(),
            new EventEmitter(),
            cache, mockFetcher,
            sdkKey, { autoRefresh: false }, 'info');

    await client.fetchAsync();

    expect(mockFetcher.fetchAll).toBeCalledTimes(1);
    expect(cache.getValue(sdkKey).lastModified).toEqual(response1.lastModified);
})

test('Test isCachedFilled', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey,
        { autoRefresh: false }, 
        'info');

    expect(client.isCacheFilled()).toBeFalsy();

    client.fetch( () => {
        try {
            expect(client.getToggleKeys()).toHaveLength(1);

            expect(client.isCacheFilled()).toBeTruthy();

            done();
        } catch(error) {
            done(error);
        }
    })
})

test('Test onUpdate with auto-refresh interval 2s', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    function onUpdateCallback(keys) {
        try {
            expect(keys).toHaveLength(1);
            expect(keys[0]).toBe('toggle1');
            expect(client.getToggleKeys()).toHaveLength(1);
            client.stopPolling();
            done();
        } catch(error) {
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
    mockFetcher.fetchAll.mockImplementationOnce( () => Promise.resolve(response2));

    client.refresh( (changed) => {
        try {
            expect(changed).toHaveLength(2);
            expect(changed[0]).toEqual('toggle1');
            expect(changed[1]).toEqual('toggle2');
            done();
        } catch(error) {
            done(error);
        }
    })
})

test('Test refreshAsync', async () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementationOnce( () => Promise.resolve(response1));

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



test('Client toggleValue should return default value if not init', () => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementationOnce( () => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    expect(client.toggleValue('toggle1', true)).toBeTruthy();
    expect(client.toggleValue('toggle29391', false)).toBeFalsy();
})
