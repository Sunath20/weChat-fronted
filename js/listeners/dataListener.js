import { CALL_INTERACTIONS, CONTACTS_INTERACTIONS, DATA_EVENTS, FRIEND_EVENTS, FRIEND_INTERACTIONS, MESSAGE_INTERACTIONS, MESSAGE_TYPES, STORE_EVENTS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { addLoadedMessages, addLoadedMessagesToStore, addMessages, addNewContact, addNewMessageToStore, resolveCurrentUser, resolveMessages, resolveSelectedUser, setSelectedFriend, store } from "../core/store.js";
import { dataHandler } from "../handlers/dataHandler.js";
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
            const mappedMessages = addMessages(messages)
            eventBus.emit(STORE_EVENTS.LOADED_MESSAGES_ADDED,mappedMessages)
    })

    eventBus.on(STORE_EVENTS.SELECTED_FRIEND_SET,payload => {
        const {contact} = payload
        const messages = resolveMessages(contact)
        const formattedMessages = formatSavedMessages(messages)
        eventBus.emit(DATA_EVENTS.NEW_SELECTED_USER_SAVED_MESSAGES,formattedMessages)

        if(!isEmptyList(messages)){
            delete messages['null']
            const dateKey = getLatestDateKey(Object.keys(messages))
            const dateMessages = formattedMessages[dateKey]
            const lastMessage = new DataHandlerMessageModel(dateMessages[dateMessages.length - 1 ])
            eventBus.emit(MESSAGE_TYPES.LOAD_NOT_DELIVERED_MESSAGES,{contact,messageID:lastMessage.messageID})
        }
        
    })


    eventBus.on(CONTACTS_INTERACTIONS.NEW_CONTACT_ADD,payload => {
            const nameInput = document.querySelector(".add-new-profile-name")
            const phoneInput = document.querySelector(".add-new-profile-contact")
            if(!nameInput || !phoneInput || !nameInput.value || !phoneInput.value)return;
            addNewContact({name:nameInput.value,contact:phoneInput.value});
    })
   


    eventBus.on(MESSAGE_INTERACTIONS.LOAD_PREVIOUS_MESSAGES,payload => {
        const message = dataHandler.getLastMessage()
        eventBus.emit(MESSAGE_TYPES.LOAD_PREVIOUS_MESSAGES,
            {lastMessage:message,currentUser:resolveCurrentUser().contact,
            selectedUser:resolveSelectedUser().contact
            }
    )
    })

    eventBus.on(MESSAGE_TYPES.LOADED_PREVIOUS_MESSAGES,payload => {
        const {messageWith,messages} = payload
        addLoadedMessages(messages,messageWith)
    })

    eventBus.on(FRIEND_INTERACTIONS.SEARCH_FRIENDS_VIEW,payload => {
        const contacts = dataHandler.filterContacts(payload)
        eventBus.emit(FRIEND_EVENTS.FILTERED_CONTACTS,contacts)
    })



  
}