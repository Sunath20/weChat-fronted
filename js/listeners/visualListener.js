import {
    APP_INTERACTIONS,
    CALL_INTERACTIONS,
    CALL_TYPES,
    DATA_EVENTS,
    DOWNLOAD_EVENTS,
    DOWNLOAD_INTERACTIONS,
    FILE_EVENTS,
    FILE_INTERACTIONS,
    FRIEND_EVENTS,
    FRIEND_INTERACTIONS,
    MESSAGE_TYPES,
    STORE_EVENTS,
    UPLOAD_INTERACTIONS,
    USER_HANDLES,
    VISUAL_EVENTS
} from "../core/Actions.js";
import { DOWNLOADING_STATUS } from "../core/DownloadManager.js";
import { eventBus } from "../core/EventBus.js";
import { addNewNotification, getCallingContact, resolveChatVisibility, resolveContacts, resolveCurrentUser, resolveSelectedUser, store, updateMessageInStore } from "../core/Store.js";
import { FILE_INPUT_MODAL_TAG } from "../handlers/clickHandler.js";
import { visualHandler } from "../handlers/visualHandler.js";
import { DataHandlerMessageModel } from "../models.js";
import { formatSavedMessages, messageListToDateBase } from "../utils/dataFormatting.js";
import {convertToLastSeenAt, tagBaseOnDate} from "../utils/dateUtils.js";



export function initVisualListener(){
    
    eventBus.on(STORE_EVENTS.MESSAGE_ADDED,message => {
        console.log("Okay we gonne add this to the UI AT LAST ",message)
        const user = resolveSelectedUser()
        console.log("WE gonna find the problem anyway there's no hiding ",user,user.contact === message.friend)
        if(user.contact === message.friend){
            visualHandler.addOneToday(message)
            visualHandler.scrollToBottom()
        }else{
            addNewNotification(message)
        }

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
        visualHandler.clearChat();
    })

    eventBus.on(DATA_EVENTS.MESSAGES_ADD,payload => {
        visualHandler.addMessagesToTheView(payload)
        visualHandler.scrollToBottom()
    })

    eventBus.on(DATA_EVENTS.NEW_SELECTED_USER_SAVED_MESSAGES,payload => {
        visualHandler.clearChat()
        visualHandler.addMessagesToTheView(payload)
        visualHandler.scrollToBottom()
    })

    eventBus.on(STORE_EVENTS.ADD_NOT_DELIVERED_MESSAGES,payload => {
        const {contact,messages} = payload
        const formattedMessages = formatSavedMessages(messages)
        visualHandler.addMessagesToTheView(formattedMessages)
    })
 
    eventBus.on(STORE_EVENTS.LOADED_MESSAGES_ADDED,payload => {
        const msgOBJ = messageListToDateBase(payload)
        visualHandler.updatePreviousMessage(msgOBJ,true)
    })

    eventBus.on(CALL_INTERACTIONS.START_AUDIO_CALL,payload => {
        const data = resolveCurrentUser()
        data['state'] = "calling"
        visualHandler.initCallerDialogWithUserInfo(data)
    })

    eventBus.on(CALL_INTERACTIONS.VIDEO_CALL_START,payload => {
        const data = resolveCurrentUser()
        data['state'] = "calling"
        visualHandler.initCallerDialogWithUserInfo(data)
    })

    eventBus.on(CALL_INTERACTIONS.CLOSE_CALL_FINISHED_DIALOG,payload => {
        visualHandler.closeCallDialog()
    })

    eventBus.on(STORE_EVENTS.NOTIFICATION_COUNT_CHANGED,({friend,count}) => {
        visualHandler.showNewsMessageNotification(friend,count)
    })

    eventBus.on(STORE_EVENTS.NEW_CONTACT_ADDED,details => {
        visualHandler.addNewContact(details)
    })

    eventBus.on(STORE_EVENTS.LOADED_PREVIOUS_MESSAGES,payload => {
        const {messages,messageWith} = payload
        const selectedUser = resolveSelectedUser().contact
        if(messageWith === selectedUser && resolveChatVisibility()){
            visualHandler.updatePreviousMessage(messages)
        }
    })

    eventBus.on(APP_INTERACTIONS.SETTINGS_OPEN,payload =>{
       visualHandler.setLeftSideAppTab('2')
    })

    eventBus.on(APP_INTERACTIONS.SETTINGS_CLOSE,payload => {
        visualHandler.setLeftSideAppTab('1')
    })


    eventBus.on(UPLOAD_INTERACTIONS.SHOW_UPLOAD_MODAL,modalTag => {
        visualHandler.modalHandler.showModal(modalTag)
    })

    eventBus.on(UPLOAD_INTERACTIONS.CLOSE_UPLOAD_MODAL,modalTag => {
        visualHandler.modalHandler.hideModal(modalTag)
        visualHandler.clearFileUploadPreview();
    })    



    eventBus.on(FRIEND_INTERACTIONS.NORMAL_FRIENDS_VIEW,payload => {
        visualHandler.setFriendsDetailsTab('1')
    })

    eventBus.on(FRIEND_INTERACTIONS.SEARCH_FRIENDS_VIEW,payload => {
        visualHandler.setFriendsDetailsTab('2')
    })

    eventBus.on(FRIEND_EVENTS.FILTERED_CONTACTS,contacts => {
            visualHandler.renderFriends(contacts,".friends-search-result")
    })


    eventBus.on(FILE_EVENTS.FILE_READ_COMPLETE_LOCAL,({mimeType,messageID,fileName,file}) => {
        // console.log(fileName,mimeType,messageID," this file is inside the data base")
        visualHandler.addFilePreviewAfterLoading({messageID,file,fileName,mimeType})
    })

    eventBus.on(FILE_EVENTS.FILE_ACCEPT_DOWNLOAD_REQUEST,({roomID,messageID,fileName,mimeType}) => {
        visualHandler.addDownloadButtonForFile({roomID,messageID,fileName,mimeType})
    })


    eventBus.on(DOWNLOAD_EVENTS.ADDED_TO_QUEUE,({roomID,messageID,fileName,mimeType}) => {
        visualHandler.addNewFileToDownloadManager({roomID,messageID,fileName,mimeType})
    })

    eventBus.on(DOWNLOAD_EVENTS.START_DOWNLOAD,({roomID,messageID,fileName,mimeType}) => {
            visualHandler.addNewFileToDownloadManager({roomID,fileName,messageID,mimeType})
            visualHandler.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.WAITING);
    })

    eventBus.on(DOWNLOAD_EVENTS.INIT_FILE_SIZE,({messageID,fileSize}) => {
        visualHandler.updateDownloadingMetaInfo({messageID,fileSize,downloaded:0})
    })

    eventBus.on(DOWNLOAD_EVENTS.DOWNLOAD_FINISH,({mimeType,messageID,fileName,file}) => {
        visualHandler.removeDownloadButtonForFile({mimeType,messageID,fileName,file})
        visualHandler.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.FINISHED)
    })

    eventBus.on(FILE_EVENTS.FILE_COMMITTED_TEMP_FILE,({messageID,file,fileName,mimeType}) => {
          visualHandler.addFilePreviewAfterLoading({messageID,file,fileName,mimeType,fromNetwork:true})
    })

    eventBus.on(DOWNLOAD_EVENTS.RECEIVED_A_CHUNK,({fileID,chunks,downloaded,fileSize,messageID,fileName}) => {
        console.log("Updating ",downloaded,chunks,fileName)
        visualHandler.updateDownloadingMetaInfo({fileID,downloaded,fileSize,messageID,chunks,fileName})
        visualHandler.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.DOWNLOADING)
    })

    



    // DOWNLOAD - INTERACTIONS
    eventBus.on(DOWNLOAD_INTERACTIONS.SHOW_FULL_MANAGER,payload => {
        visualHandler.setDownloadViewToFull()
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.MINIMIZE_DOWNLOAD_MANAGER,payload => {
        visualHandler.minimizeDownloadView()
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.PAUSE_DOWNLOAD_ITEM,({messageID}) => {
        visualHandler.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.PAUSED)
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.START_DOWNLOAD_FROM_PAUSED,({messageID}) => {
        visualHandler.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.DOWNLOADING)
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.REMOVE_DOWNLOAD,({messageID,fileName}) => {
        visualHandler.removeDownloadFromManager(messageID)
    })


    eventBus.on(USER_HANDLES.RECEIVE_FRIEND_IS_ONLINE,payload => {
        const {lastOnlineAt,online} = payload;
        visualHandler.setCurrentFriendStatus(online ? "Online" : convertToLastSeenAt(lastOnlineAt));
    })


    eventBus.on(VISUAL_EVENTS.ADD_CHAT_LOADING_BANNER,(payload) => {
        visualHandler.renderSelectedFriend(payload)
        visualHandler.showChatLoading();
    })

    eventBus.on(VISUAL_EVENTS.REMOVE_CHAT_LOADING_BANNER,() => {
        visualHandler.hideChatLoading()
    })


    
    
}