import { Client } from '../src/Client';
import { Evaluator } from '../src/Evaluator';
import { EventEmitter } from '../src/Emitter';
import { MemoryCache } from '../src/MemoryCache';
import { ResponseCache } from '../src/Cache';
import { Fetcher } from '../src/Fetcher';
import { mocked } from 'ts-jest/utils'
import { ApiResponse } from '../src/ApiResponse';


test('Test forceRefresh with changed nothing', async () => {

    const sdkKey = 'some_key'

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

    mockFetcher.fetchAll.mockImplementation( () => Promise.resolve(response1));

    const cache = new MemoryCache();
    const client = new Client(
            new Evaluator(), 
            new EventEmitter(),
            cache, mockFetcher, 
            sdkKey, { autoRefresh: false }, 'info');

    await client;
    expect(mockFetcher.fetchAll).toBeCalledTimes(1);

    expect(cache.getValue(sdkKey).lastModified).toEqual(response1.lastModified);


    client.onUpdated( (changed) => {
        expect(changed).toBeNull();
    })

    client.forceRefresh()
});

test('Test forceRefresh with one new toggle', async () => {
    const sdkKey = 'some_key'

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

    mockFetcher.fetchAll.mockImplementationOnce( () => Promise.resolve(response1));

    const client = new Client(
        new Evaluator(), 
        new EventEmitter(),
        new MemoryCache(), 
        mockFetcher, 
        sdkKey, { autoRefresh: false }, 'info');

    await client;
    expect(mockFetcher.fetchAll).toBeCalledTimes(1);

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

    client.onUpdated( (changed) => {
        expect(changed).toHaveLength(1);
        expect(changed[0]).toEqual('toggle2');
    })

    client.forceRefresh()

})
