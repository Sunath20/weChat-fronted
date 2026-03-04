import { REGISTER_EVENTS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { clickHandler } from "../handlers/clickHandler.js";



export function initClickListener(){
    eventBus.on(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,({element,event,payload}) => {
        clickHandler.setOnClick(element,(e) => {
            eventBus.emit(event,payload)
        })
    })
} 