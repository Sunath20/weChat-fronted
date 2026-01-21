import {eventBus} from "../core/EventBus.js"
import {CALL_TYPES, CLICK_EVENTS, STORE_EVENTS} from "../core/Actions.js"
import {VisualHandler} from "../handlers/visualHandler.js"
import { callHandler , CallHandler } from "../handlers/callHandler.js"
import { getCallingContact, resolveCallingContact, setCallingContact, store } from "../core/store.js"

/**
 * 
 * @param {CallHandler} callHandler 
 */
export function initCallListener(cH=callHandler){
   
    eventBus.on(CALL_TYPES.CALL_OFFER_RECEIVED,(payload) => {
        const contact = resolveCallingContact(payload)
        console.log("This is the caller ",contact)
        setCallingContact(contact)
        console.log("okay saved ",getCallingContact())
        eventBus.emit(STORE_EVENTS.CALLING_CONTACT_SET,contact)
        cH.onCallOfferReceived(payload)
    })

    eventBus.on(CALL_TYPES.CALL_ANSWER_RECEIVED,async (payload) => {
        await cH.onCallAnswerReceived(payload)
    })

    eventBus.on(CALL_TYPES.CALL_ICE_NEW_CANDIDATE_RECEIVED,async payload => {
        await cH.onNewIceCandidate(payload)
    })

    eventBus.on(CLICK_EVENTS.CALL_ACCEPT,async (payload) => {
        const contact = getCallingContact()
        await cH.answerEventByReceiver(contact)
    })


}