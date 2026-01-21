import {eventBus} from "../core/EventBus.js"
import {CALL_TYPES, MAIN_HANDLERS, MESSAGE_TYPES, VISUAL_EVENTS} from "../core/Actions.js"
import {webSocketHandler} from "../handlers/requestHandling.js"
import { getSelectedUsersID } from "../utils.js"
import { DataHandlerMessageModel } from "../models.js"
import { addNewMessageToStore, updateMessageInStore } from "../core/store.js"
export function initMessageListener(){


    eventBus.on(MESSAGE_TYPES.MESSAGE_RECEIVED,(payload) => { 
        addNewMessageToStore(payload)
        webSocketHandler.sendDeliveredMessage(payload.from,payload['_id']);
    })

    eventBus.on(MESSAGE_TYPES.GET_BACK_CREATED_MESSAGE,(payload) => {
        const message = new DataHandlerMessageModel(payload)
        message.friend = payload.friend;
        message['fromUser'] = true
        addNewMessageToStore(message)
    })


    eventBus.on(MESSAGE_TYPES.MESSAGE_DELIVERED,(payload) => {
        updateMessageInStore(payload.from,payload.messageID,payload.changes)
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_LIST_OF_MESSAGE_DELIVERED,(payload) => {
        const {messageIDList,deliveredTime,from} = payload
        messageIDList.forEach((e) => {
            updateMessageInStore(from,e,{userReceivedAt:deliveredTime})
        })
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_SEEN_MESSAGE,(payload) => {
        const {changes,from,messageID} = payload;
        updateMessageInStore(from,messageID,changes)
    })

    eventBus.on(MESSAGE_TYPES.SET_SEEN_MESSAGE,payload => {
        const {messageID,time} = payload;
        const {to} = getSelectedUsersID()
        webSocketHandler.sendSeenMessage(messageID,to,time)
    })


    eventBus.on(CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER,(payload) => {
        
        const userPayload = {
                    mainHandler:MAIN_HANDLERS.CALL,
                    handlerOne:CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER,
                    to:payload.to
        }

        webSocketHandler.sendData(JSON.stringify(userPayload))
    })

    eventBus.on(CALL_TYPES.CALL_ANSWER_CREATED,payload => {
        webSocketHandler.sendData(JSON.stringify(payload))
    })

  

}
