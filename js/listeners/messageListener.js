import {eventBus} from "../core/EventBus.js"
import {
    CALL_EVENTS, CALL_TYPES, FILE_EVENTS, FILE_TYPES, FRIEND_INTERACTIONS, MAIN_HANDLERS, MESSAGE_TYPES, STORE_EVENTS,
    UPLOAD_INTERACTIONS, VISUAL_EVENTS
} from "../core/Actions.js"
import {apiHandler, webSocketHandler} from "../handlers/requestHandling.js"
import {getSelectedUsersID, query} from "../utils.js"
import { DataHandlerMessageModel } from "../models.js"
import {
    addNewFileMessageToStore,
    addNewMessageToStore,
    resolveCurrentUser,
    resolveRoomID,
    resolveSelectedUser,
    setCurrentRoomID,
    setRoomID,
    store,
    updateMessageInStore
} from "../core/Store.js"
import {addMessages, messageDB} from "../core/MessageDB.js";
import {cryptoHandler} from "../handlers/cryptoHandler.js";

export function initMessageListener(){

    eventBus.on(MESSAGE_TYPES.MESSAGE_RECEIVED,async (payload) => {
        const {contact} = store.getState().currentUser
        const msgs = await addMessages(payload,contact)
        const msg = msgs[0]
        const key = await cryptoHandler.loadFriendKey(msg.friend)
        try{
            const decryptedContent = await cryptoHandler.decryptMessage(JSON.parse(msg['content']),key)
            msg['content']  = decryptedContent
        }catch(error){
            console.log("Probably not encrypted")
        }

        eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msgs[0])
        webSocketHandler.sendDeliveredMessage(payload.from,payload['_id'],payload['createdat']);
    })

    eventBus.on(MESSAGE_TYPES.FILE_MESSAGE_RECEIVE_TO_OTHER_USER,async (payload) => {
            const {contact} = store.getState().currentUser
          const msg = await addMessages(payload)
          eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msg[0])
          webSocketHandler.sendDeliveredMessage(payload.from,payload['_id']);
    });

    eventBus.on(MESSAGE_TYPES.GET_BACK_CREATED_MESSAGE,async (payload) => {
        const {contact} = store.getState().currentUser
       const msgs = await addMessages(payload,contact)
        const msg = msgs[0]
        const key = await cryptoHandler.loadFriendKey(msg.friend)
        try{
            const decryptedInfo = await cryptoHandler.decryptMessage(JSON.parse(msg['content']),key)
            msg['content']  = decryptedInfo;
        }catch (error){
            console.log("Probably not encrypted or a file")
        }

       eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msgs[0])
    })


    eventBus.on(MESSAGE_TYPES.MESSAGE_DELIVERED,async (payload) => {
        // updateMessageInStore(payload.from,payload.messageID,payload.changes)
        await messageDB.updateMessage(payload.messageID,payload.changes)
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_LIST_OF_MESSAGE_DELIVERED,(payload) => {
        const {messageIDList,deliveredTime,from} = payload
        messageIDList.forEach((e) => {
            updateMessageInStore(from,e,{userReceivedAt:deliveredTime})
        })
    })

    eventBus.on(MESSAGE_TYPES.RECEIVE_SEEN_MESSAGE,async (payload) => {
        const {changes,from,messageID} = payload;
        await messageDB.updateMessage(messageID,changes)
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

    eventBus.on(CALL_EVENTS.CALL_OFFER_CREATED,payload => {
        webSocketHandler.sendData(JSON.stringify(payload))
    })

    eventBus.on(MESSAGE_TYPES.LOAD_PREVIOUS_MESSAGES,payload => {
        const {lastMessage,currentUser,selectedUser} = payload
        apiHandler.loadPreviousMessages(currentUser,selectedUser,lastMessage.createdAt)
  })



    //     Profile picture update
    eventBus.on(UPLOAD_INTERACTIONS.START_UPLOAD_PROFILE_PICTURE,async payload => {
        const fileInputElement = query(".user-new-profile-pic-input");
        if(fileInputElement.files){
            const response = await apiHandler.uploadProfilePic(fileInputElement.files[0])
            console.log(response)
        }
    })

}
