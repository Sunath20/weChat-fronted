import { CALL_TYPES, FILE_INTERACTIONS, MESSAGE_TYPES, STORE_EVENTS, VISUAL_EVENTS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { getCallingContact, updateMessageInStore } from "../core/store.js";
import { FILE_INPUT_MODAL_TAG } from "../handlers/clickHandler.js";
import { visualHandler } from "../handlers/visualHandler.js";
import { DataHandlerMessageModel } from "../models.js";



export function initVisualListener(){
    
    eventBus.on(STORE_EVENTS.MESSAGE_ADDED,message => {
        const msg = new DataHandlerMessageModel(message)
        visualHandler.addOneToday(msg)
    })


    eventBus.on(MESSAGE_TYPES.MESSAGE_DELIVERED,(payload) => {
        visualHandler.setMessageDelivered(payload.messageID)
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_LIST_OF_MESSAGE_DELIVERED,(payload) => {
        const {messageIDList} = payload
        messageIDList.forEach(e => {
            visualHandler.setMessageDelivered(e)
        })
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_SEEN_MESSAGE,(payload) => {
        const {messageID} = payload
        visualHandler.readMessage(messageID)
    })

    eventBus.on(STORE_EVENTS.CALLING_CONTACT_SET,payload => {
        console.log("Update caller ",payload)
        visualHandler.initCallReceiverDialogWithUserInfo(payload)
    })

    eventBus.on(CALL_TYPES.CALL_ANSWER_CREATED,payload => {
        visualHandler.setCallTab(!payload.onlyAudio ? '3' : '5')
    })

    eventBus.on(CALL_TYPES.CALL_ANSWER_RECEIVED,payload => {
         visualHandler.setCallTab(!payload.onlyAudio ? '3' : '5')
    })

    eventBus.on(CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER,payload => {
        visualHandler.closeCallDialog()
    })

    eventBus.on(CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER_RECEIVED,payload => {
        const contact = getCallingContact()
        visualHandler.updateCallEndedBy(contact ? contact.name : "No name")
        visualHandler.setCallTab('4')
    })

    // File Handling
    eventBus.on(FILE_INTERACTIONS.FILE_UPLOAD_DIALOG_OPEN,payload => {
        visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    })

    eventBus.on(FILE_INTERACTIONS.FILE_SET_UPLOAD_PREVIEWS,payload => {
        visualHandler.uploadFilePreviews(payload)
    })

    
}