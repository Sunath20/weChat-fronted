import { DATA_EVENTS, FRIEND_INTERACTIONS, MESSAGE_TYPES, STORE_EVENTS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { addLoadedMessagesToStore, addMessages, addNewMessageToStore, resolveMessages, setSelectedFriend } from "../core/store.js";
import { apiHandler } from "../handlers/requestHandling.js";
import { DataHandlerMessageModel } from "../models.js";
import { getLatestDateKey } from "../utils.js";
import { formatSavedMessages } from "../utils/dataFormatting.js";
import { isEmptyList } from "../utils/otherUtils.js";


export function initDataListener(){
    
    eventBus.on(FRIEND_INTERACTIONS.FRIEND_SELECTED,(payload) => {
        setSelectedFriend(payload);
        eventBus.emit(STORE_EVENTS.SELECTED_FRIEND_SET,payload)
    });

      eventBus.on(MESSAGE_TYPES.LOADED_NOT_DELIVERED_MESSAGES,payload => {
            const {messages,contact} = payload
            console.log("Got these messages ",payload)
            const mappedMessages = addMessages(messages)
            console.log("Output the  loaded messages ",mappedMessages)
            eventBus.emit(STORE_EVENTS.LOADED_MESSAGES_ADDED,mappedMessages)
        
        
    })



    eventBus.on(STORE_EVENTS.SELECTED_FRIEND_SET,payload => {
        const {contact} = payload
        const messages = resolveMessages(contact)
        const formattedMessages = formatSavedMessages(messages)
    
        eventBus.emit(DATA_EVENTS.MESSAGES_ADD,formattedMessages)

        if(!isEmptyList(messages)){
            const dateKey = getLatestDateKey(Object.keys(messages))
            const dateMessages = formattedMessages[dateKey]
            const lastMessage = new DataHandlerMessageModel(dateMessages[dateMessages.length - 1 ])
            eventBus.emit(MESSAGE_TYPES.LOAD_NOT_DELIVERED_MESSAGES,{contact,messageID:lastMessage.messageID})
        }
        
    })
  
}