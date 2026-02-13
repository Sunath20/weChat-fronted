import {eventBus} from "../core/EventBus.js"
import {CALL_INTERACTIONS, CALL_TYPES, CLICK_EVENTS, STORE_EVENTS} from "../core/Actions.js"
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
        setCallingContact(contact)
        eventBus.emit(STORE_EVENTS.CALLING_CONTACT_SET,contact)
        cH.onCallOfferReceived(payload)
    })

    eventBus.on(CALL_TYPES.CALL_ANSWER_RECEIVED,async (payload) => {
        await cH.onCallAnswerReceived(payload)
    })

    eventBus.on(CALL_TYPES.CALL_ICE_NEW_CANDIDATE_RECEIVED,async payload => {
        await cH.onNewIceCandidate(payload)
    })

     eventBus.on(CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER_RECEIVED,payload => {
            callHandler.closeCall(false)
    })

    eventBus.on(CLICK_EVENTS.CALL_ACCEPT,async (payload) => {
        const contact = getCallingContact()
        await cH.answerEventByReceiver(contact)
    })

  

    eventBus.on(CALL_INTERACTIONS.START_AUDIO_CALL,(payload) => {
        callHandler.initCall()
    })

    eventBus.on(CALL_INTERACTIONS.CANCEL_AUDIO_ONLY_CALL,payload => {
        callHandler.closeCall()
    })

    eventBus.on(CALL_INTERACTIONS.CANCEL_CALL,payload => {
        callHandler.closeCall()
    })


}