import { CALL_INTERACTIONS, CONTACTS_INTERACTIONS, DATA_EVENTS, DOWNLOAD_EVENTS, DOWNLOAD_INTERACTIONS, FRIEND_EVENTS, FRIEND_INTERACTIONS, MESSAGE_INTERACTIONS, MESSAGE_TYPES, STORE_EVENTS } from "../core/Actions.js";
import { DOWNLOADING_STATUS } from "../core/DownloadManager.js";
import { eventBus } from "../core/EventBus.js";
import { addNewContact, removeDownloadFileInfo, resolveCurrentUser, resolveSelectedUser, setSelectedFriend, updateDownloadFileInfo, addDownloadFile } from "../core/Store.js";
import { apiHandler } from "../handlers/requestHandling.js";
import { cryptoHandler } from "../handlers/cryptoHandler.js";
import { DataHandlerMessageModel } from "../models.js";
import { formatSavedMessages } from "../utils/dataFormatting.js";
import { isEmptyList } from "../utils/otherUtils.js";
import { addMessages, messageDB, resolveLatestMessages } from "../core/MessageDB.js";


export function initDataListener(){

    eventBus.on(FRIEND_INTERACTIONS.FRIEND_SELECTED, (payload) => {
        setSelectedFriend(payload);
        eventBus.emit(STORE_EVENTS.SELECTED_FRIEND_SET, payload)
    });

    eventBus.on(MESSAGE_TYPES.LOADED_NOT_DELIVERED_MESSAGES, async payload => {
        const {messages, contact} = payload;
        const currentUserContact = resolveCurrentUser().contact;
        const mappedMessages = messages.map(e => {
            const msg = new DataHandlerMessageModel(e);
            msg.fromUser = false;
            msg.friend = contact;
            return msg;
        });
        const outputMessages = await addMessages(mappedMessages, currentUserContact, false);
        eventBus.emit(STORE_EVENTS.LOADED_MESSAGES_ADDED, outputMessages);
    })

    eventBus.on(STORE_EVENTS.SELECTED_FRIEND_SET, async ({name, contact}) => {
        const messages = await resolveLatestMessages(contact);
        if(!messages || messages.length === 0) return;

        // decrypt on load
        const friendKey = await cryptoHandler.loadFriendKey(contact);
        const decryptedMessages = await Promise.all(messages.map(async (msg) => {
            try{
                if(msg.contentType !== "File"){
                    msg.content = await cryptoHandler.decryptMessage(JSON.parse(msg.content), friendKey);
                }
            }catch(error){
                console.error("Failed to decrypt message", msg.messageID);
            }
            return msg;
        }));

        const formattedMessages = formatSavedMessages(decryptedMessages);
        eventBus.emit(DATA_EVENTS.NEW_SELECTED_USER_SAVED_MESSAGES, formattedMessages);

        if(!isEmptyList(messages)){
            const lastMessage = await messageDB.getLastMessage(contact);
            eventBus.emit(MESSAGE_TYPES.LOAD_NOT_DELIVERED_MESSAGES, {contact, messageID: lastMessage.messageID});
        }
    })

    eventBus.on(CONTACTS_INTERACTIONS.NEW_CONTACT_ADD, payload => {
        const nameInput = document.querySelector(".add-new-profile-name");
        const phoneInput = document.querySelector(".add-new-profile-contact");
        if(!nameInput || !phoneInput || !nameInput.value || !phoneInput.value) return;
        addNewContact({name: nameInput.value, contact: phoneInput.value});
    })

    eventBus.on(MESSAGE_INTERACTIONS.LOAD_PREVIOUS_MESSAGES, async payload => {
        const selectedUser = resolveSelectedUser();
        const lastMessage = await messageDB.getLastMessage(selectedUser.contact);
        if(!lastMessage) return;
        eventBus.emit(MESSAGE_TYPES.LOAD_PREVIOUS_MESSAGES, {
            lastMessage,
            currentUser: resolveCurrentUser().contact,
            selectedUser: selectedUser.contact
        });
    })

    eventBus.on(MESSAGE_TYPES.LOADED_PREVIOUS_MESSAGES, async payload => {
        const {messageWith, messages} = payload;
        const currentUserContact = resolveCurrentUser().contact;
        const saved = await addMessages(messages, currentUserContact, false);
        const formatted = formatSavedMessages(saved);
        eventBus.emit(STORE_EVENTS.LOADED_MESSAGES_ADDED, formatted);
    })

    eventBus.on(FRIEND_INTERACTIONS.SEARCH_FRIENDS_VIEW, payload => {
        const contacts = dataHandler.filterContacts(payload);
        eventBus.emit(FRIEND_EVENTS.FILTERED_CONTACTS, contacts);
    })

    eventBus.on(DOWNLOAD_EVENTS.ADDED_TO_QUEUE, ({roomID, messageID, fileName, mimeType}) => {
        addDownloadFile({roomID, messageID, fileName, mimeType});
    })

    eventBus.on(DOWNLOAD_EVENTS.INIT_FILE_SIZE, ({messageID, fileSize}) => {
        updateDownloadFileInfo({messageID, fileSize});
    })

    eventBus.on(DOWNLOAD_EVENTS.START_DOWNLOAD, ({roomID, messageID, fileName, mimeType}) => {
        updateDownloadFileInfo({messageID, status: DOWNLOADING_STATUS.DOWNLOADING});
    })

    eventBus.on(DOWNLOAD_EVENTS.UPDATE_FILE_DOWNLOADED_TOTAL_CHUNK, ({fileID, downloaded, fileSize, messageID, fileName}) => {
        updateDownloadFileInfo({messageID, downloaded});
    })

    eventBus.on(DOWNLOAD_EVENTS.DOWNLOAD_FINISH, ({fileID, messageID, fileName, file, mimeType}) => {
        updateDownloadFileInfo({messageID, status: DOWNLOADING_STATUS.FINISHED});
        removeDownloadFileInfo({messageID});
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.PAUSE_DOWNLOAD_ITEM, ({messageID, fileName}) => {
        updateDownloadFileInfo({messageID, status: DOWNLOADING_STATUS.PAUSED});
    })

}