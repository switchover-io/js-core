
export interface Emitter {
    on(eventKey: string, fn: Listener) : void;

    off(eventKey: string, fn: Listener) : void;

    getListeners(eventKey: string) : Listener[];

    emit(eventKey: string, data?: any) : void;
}

export type Listener = (data?: any) => void;

export class EventEmitter implements Emitter {

    _events: Record<string, Listener[]> = {};

    public on(eventKey: string, fn: Listener) : void {
        this._events[eventKey] = (this._events[eventKey] || []).concat(fn)
    }

    public off(eventKey: string, fn: Listener) : void {
        this._events[eventKey] = (this._events[eventKey] || []).filter(f => f !== fn);
    }

    public getListeners(eventKey: string) : Listener[] {
        return this._events[eventKey] || [];
    }

    public emit(eventKey: string, data?: any) : void {
        (this._events[eventKey] || []).forEach(fn => {
            fn(data);
        });
    }   
}