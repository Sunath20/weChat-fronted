

class EventBus {
    
    constructor(){
        this.events = new Map()
    }

    on(event,handler){
        if(!this.events.has(event)){
            this.events.set(event,[])
        }
        this.events.get(event).push(handler)
    }

    off(event,handler){
        const handlers = this.events.get(event);
        if(!handlers)return;
        this.events.set(event,handler.filter(e => e !== handler))
    }

    emit(event,payload){
        const handlers = this.events.get(event);
        if(!handlers)return;
        handlers.forEach(e => e(payload))
    }

}


export const eventBus = new EventBus()