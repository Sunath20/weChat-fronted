import { CALL_TYPES, DATA_EVENTS, FILE_EVENTS, FILE_INTERACTIONS, FRIEND_INTERACTIONS, MESSAGE_TYPES, STORE_EVENTS, VISUAL_EVENTS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { getCallingContact, resolveMessages, store, updateMessageInStore } from "../core/store.js";
import { FILE_INPUT_MODAL_TAG } from "../handlers/clickHandler.js";
import { visualHandler } from "../handlers/visualHandler.js";
import { DataHandlerMessageModel } from "../models.js";
import { formatSavedMessages, messageListToDateBase } from "../utils/dataFormatting.js";
import { tagBaseOnDate } from "../utils/dateUtils.js";



export function initVisualListener(){
    
    eventBus.on(STORE_EVENTS.MESSAGE_ADDED,message => {
        visualHandler.addOneToday(message)
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

    eventBus.on(FILE_EVENTS.FILE_CHUNK_COMPLETED,(payload) => {
        visualHandler.updateUploadProgress(payload)
    })

   

    eventBus.on(FILE_EVENTS.FILE_UPLOAD_ALL_FINISHED,(payload) => {
        visualHandler.clearFileUploadPreview()
        visualHandler.modalHandler.hideModal(FILE_INPUT_MODAL_TAG)
    })

    // Friends 
    eventBus.on(STORE_EVENTS.SELECTED_FRIEND_SET,payload => {
        visualHandler.renderSelectedFriend(payload)
        // const messages = resolveMessages(payload.contact)
        // visualHandler.addMessagesToTheView(messages)
    })

    eventBus.on(DATA_EVENTS.MESSAGES_ADD,payload => {

        visualHandler.addMessagesToTheView(payload)
    })

    eventBus.on(STORE_EVENTS.ADD_NOT_DELIVERED_MESSAGES,payload => {
        const {contact,messages} = payload
        const formattedMessages = formatSavedMessages(messages)
        visualHandler.addMessagesToTheView(formattedMessages)
    })

    eventBus.on(STORE_EVENTS.LOADED_MESSAGES_ADDED,payload => {
        console.log("Updating the following messages ",payload)
        const msgOBJ = messageListToDateBase(payload)
        console.log("Update object ",msgOBJ)
        visualHandler.updatePreviousMessage(msgOBJ,true)
    })



    

    
}