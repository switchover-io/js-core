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

test('Test onUpdate handler on client creation', done => {
    const sdkKey = 'some_key'

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    function onUpdateCallback() {
        try {
            expect(client.getToggleKeys()).toHaveLength(1);
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
            autoRefresh: false,
            onUpdate: onUpdateCallback 
        },
        'info');

    client.forceRefresh();
})


test('Test forceRefresh with new toggles on update', done => {
    const sdkKey = 'some_key'

    //mockFetcher.fetchAll.mockImplementationOnce( () => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(),
        new EventEmitter(),
        new MemoryCache(),
        mockFetcher,
        sdkKey, { autoRefresh: false }, 'info');

    //await client;
    //expect(mockFetcher.fetchAll).toBeCalledTimes(1);

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

    client.onUpdate( (changed) => {
        try {
            expect(changed).toHaveLength(2);
            expect(changed[0]).toEqual('toggle1');
            expect(changed[1]).toEqual('toggle2');
            done();
        } catch(error) {
            done(error);
        }
    })

    client.forceRefresh()

})


test('Client.active should return default value if not init', () => {
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
