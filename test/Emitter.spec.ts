import { EventEmitter } from '../src/Emitter';

test('register event', () => {
    const emitter = new EventEmitter();
    emitter.on('init', () => {
        //nothing
    });

    const fns = emitter.getListeners('init');
    expect(fns).toHaveLength(1);
})

test('register and emit event', () => {
    const emitter = new EventEmitter();
    emitter.on('init', () => {
        expect(true).toBeTruthy();
    });

    emitter.emit('init');
});

test('register and emit event with params', () => {
    const emitter = new EventEmitter();
    emitter.on('init', (data) => {
        //nothing
        expect(data).not.toBeNull();
        expect(data.payload).toEqual('message');
    });

    emitter.emit('init', { payload: 'message'});
});

test('register and off', () => {

    const emitter = new EventEmitter();

    const cb1 = () => { };
    const cb2 = () => { };

    emitter.on('init', cb1);
    emitter.on('updated', cb2);

    expect(emitter.getListeners('init')).toHaveLength(1);
    expect(emitter.getListeners('updated')).toHaveLength(1);

    emitter.off('init', cb1);

    expect(emitter.getListeners('init')).toHaveLength(0);
    expect(emitter.getListeners('updated')).toHaveLength(1);
});