import {eventBus} from "../core/EventBus.js"
import {CALL_TYPES, FILE_EVENTS, FILE_TYPES, FRIEND_INTERACTIONS, MAIN_HANDLERS, MESSAGE_TYPES, STORE_EVENTS, VISUAL_EVENTS} from "../core/Actions.js"
import {apiHandler, webSocketHandler} from "../handlers/requestHandling.js"
import { getSelectedUsersID } from "../utils.js"
import { DataHandlerMessageModel } from "../models.js"
import { addMessages, addNewFileMessageToStore, addNewMessageToStore, resolveCurrentUser, resolveRoomID, resolveSelectedUser, setCurrentRoomID, setRoomID, updateMessageInStore } from "../core/store.js"

export function initMessageListener(){

    eventBus.on(MESSAGE_TYPES.MESSAGE_RECEIVED,(payload) => { 
       const msg = addMessages(payload)
       eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msg[0])

       console.log("Message Received from other user ",payload)
        webSocketHandler.sendDeliveredMessage(payload.from,payload['_id'],payload['createdat']);
    })

    eventBus.on(MESSAGE_TYPES.FILE_MESSAGE_RECEIVE_TO_OTHER_USER,(payload) => {
          const msg = addMessages(payload)
         eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msg[0])

        webSocketHandler.sendDeliveredMessage(payload.from,payload['_id']);
    });

    eventBus.on(MESSAGE_TYPES.GET_BACK_CREATED_MESSAGE,(payload) => { 
       const msg = addMessages(payload)
       eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msg[0])
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


    eventBus.on(FILE_EVENTS.FILE_UPLOAD_END,(message) => {
        const currentUser = resolveCurrentUser()
        const selectedUser  = resolveSelectedUser()

        const payload = {
                    from:currentUser.contact,
                    to:selectedUser.contact,
                    message:message,
                    mainHandler:MAIN_HANDLERS.MESSAGE,
                    handlerOne:MESSAGE_TYPES.FILE_MESSAGE_SEND_TO_OTHER_USER}
        webSocketHandler.sendData(JSON.stringify(payload))
    })


    // Fiend
    eventBus.on(STORE_EVENTS.SELECTED_FRIEND_SET,(payload) => {
        const {contact} = payload
        let roomID = resolveRoomID(contact)
        if(!roomID){
            webSocketHandler.setTheRoomForSelected(contact);
        }else{
            setCurrentRoomID(roomID)
        }
    })

    eventBus.on(MESSAGE_TYPES.ROOM_CREATED,(payload) => {
        const currentUser = resolveCurrentUser()
        let friend = currentUser.contact === payload.personone ? payload.persontwo : payload.personone
        setRoomID(friend,payload['_id'])
        setCurrentRoomID(payload['_id'])
    })

    eventBus.on(MESSAGE_TYPES.LOAD_NOT_DELIVERED_MESSAGES,payload => {
        const {contact,messageID} = payload;
        apiHandler.loadNotDeliveredMessages(contact,messageID)
    })

}
