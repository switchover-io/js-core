const assert = require("assert");
const { Client, Evaluator, MemoryCache, EventEmitter } = require('./dist');

const dummyFetcher = function(){
    return {
        fetchAll: function (sdkKey) {
            return new Promise( (res, _) => {
                res( {
                    lastModified: 'no_date',
                    payload: null
                } )
            })
        }
    }
}();



const client = new Client(
    new Evaluator(),
    new EventEmitter(),
    new MemoryCache(),
    dummyFetcher,
    'no_key',
    {
        autoRefresh: false
    },
    'info'
 )

 assert.notStrictEqual(client, null);
