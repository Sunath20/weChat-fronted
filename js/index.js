
// Import handlers
import { eventBus } from "./core/EventBus.js"
import { CallHandler } from "./handlers/callHandler.js"
import { ChatHandler } from "./handlers/chatHandler.js"
import { clickHandler, ClickHandler, UIClickHandler } from "./handlers/clickHandler.js"
import { DataHandler } from "./handlers/dataHandler.js"
import { DateHandler } from "./handlers/dateHandler.js"
import { FileHandler, WebFileHandler } from "./handlers/fileHandler.js"
import {KeyBoardHandler} from "./handlers/keyboardHandler.js"
import { Notification, setNotificationsToZero } from "./handlers/notification.js"
import {WebSocketHandler,MessageHandler,APIHandler, UserConfigHandler} from "./handlers/requestHandling.js"
import {VisualHandler} from "./handlers/visualHandler.js"
import { DatabaseMessageModel, DataHandlerMessageModel } from "./models.js"
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES, FILE_INTERACTIONS, FRIEND_INTERACTIONS, APP_EVENTS, MESSAGE_INTERACTIONS } from "./core/Actions.js"

import { getContacts, getSelectedUsersID, println, query, readData } from "./utils.js"
import { initMessageListener } from "./listeners/messageListener.js"
import { initVisualListener } from "./listeners/visualListener.js"
import { initCallListener } from "./listeners/callListener.js"
import { visualHandler } from "./handlers/visualHandler.js"
import { callHandler } from "./handlers/callHandler.js"
import { fileHandler } from "./handlers/fileHandler.js"
import { apiHandler } from "./handlers/requestHandling.js"
import { initFileListener } from "./listeners/fileListener.js"
import { initDataListener } from "./listeners/dataListener.js"
import { resolveContacts, setChatVisibility, setContacts } from "./core/store.js"
import { initUIListener } from "./listeners/uiListener.js"
import { initClickListener } from "./listeners/clickListener.js"
import { initDownloadListener } from "./listeners/downloadListener.js"
import { cryptoHandler } from "./handlers/cryptoHandler.js"

const {from} = getSelectedUsersID()



if(!from){
    window.location.href = "/login.html"
}




const webSocket = new WebSocketHandler()
const messageHandler = new MessageHandler()
const userConfigHandler = new UserConfigHandler()

const chatHandler = new ChatHandler(apiHandler)
const notification = new Notification()
const keyboardHandler = new KeyBoardHandler()

const dataHandler = new DataHandler()
const dateHandler = new DateHandler()









// Setting each handler one to another
// messageHandler.setChatHandler(chatHandler);
// messageHandler.setAPIHandler(apiHandler);
// messageHandler.setDataHandler(dataHandler)
// messageHandler.setVisualHandler(visualHandler)
// messageHandler.setWebSocketHandler(webSocket)

// visualHandler.setChatHandler(chatHandler)
// visualHandler.setNotificationHandler(notification)
// visualHandler.setDataHandler(dataHandler)
// visualHandler.setFileHandler(fileHandler)

// chatHandler.setDataHandler(dataHandler)
// chatHandler.setVisualHandler(visualHandler)
// chatHandler.setWebSocketHandler(webSocket)


// dataHandler.setDateHandler(dateHandler)
// dataHandler.setAPIHAndler(apiHandler)
// dataHandler.setWebSocketHandler(webSocket)
// dataHandler.setVisualHandler(visualHandler)

// fileHandler.setAPIHandler(apiHandler)
// fileHandler.setDataHandler(dataHandler)
// fileHandler.setVisualHandler(visualHandler)
// fileHandler.setWebSocketHandler(webSocket)


// clickHandler.setVisualHandler(visualHandler)
// clickHandler.setFileHandler(fileHandler)
// clickHandler.setCallHandler(callHandler)


// callHandler.setWebSocketHandler(webSocket);
// callHandler.setVisualHandler(visualHandler)
// callHandler.setDataHandler(dataHandler)


// userConfigHandler.setWebSocketHandler(webSocket)
// userConfigHandler.setVisualHandler(visualHandler)
// userConfigHandler.setDataHandler(dataHandler)
// userConfigHandler.setDateHandler(dateHandler)



// Passing arguments
const CHAT_SEND_TEXT_INPUT_CLS_NAME = ".text-input"
keyboardHandler.setElement(query(CHAT_SEND_TEXT_INPUT_CLS_NAME))


/**
 * Get all the contacts from the local storage
 */
const contacts = dataHandler.contacts;
visualHandler.contacts = contacts;

// webSocket.setMainHandler(MAIN_HANDLERS.MESSAGE,messageHandler)
// webSocket.setMainHandler(MAIN_HANDLERS.CALL,callHandler)
// webSocket.setMainHandler(MAIN_HANDLERS.USER_CONFIG,userConfigHandler)


function selectClickedFriend(friendDetails){
    return () => {

        eventBus.emit(FRIEND_INTERACTIONS.FRIEND_SELECTED,friendDetails)
        cryptoHandler.loadFriendKey(friendDetails['contact']).then(e => {
               
            setChatVisibility(true)
                // Set the visual setup for the friend
                dataHandler.notifications[friendDetails.contact] = 0

                // Get the messages from the storage
                const currentMessages = dataHandler.getMessages(friendDetails['contact'])
            
                if(!currentMessages){
                    // Get the messages then add them base on who sent it
                        apiHandler.getMessagesOfTwoPersons(
                            friendDetails['contact'],
                            readData('userDetails')['contact']
                        ).then(e => e.json()).then(e => {
                            if(!e)return;
                            const msgs = dataHandler.reformatMessages(e.map(x => {
                            const msgData =    new DataHandlerMessageModel(x)
                            const fromUser = x['sentbyid'] !== friendDetails['contact']
                            msgData.fromUser = fromUser;
                            msgData.friend = friendDetails['contact']
                            dataHandler.addMessage(msgData);
                            return msgData
                            }))

                            
                            const msgObject = dataHandler.groupMessagesBaseOnDate(msgs)
                            visualHandler.addMessagesToTheView(msgObject)
                        })
                }else{}
                
                chatHandler.currentMessageContacts[friendDetails.contact] = {}
                query(".main-container").setAttribute("showMessages","true")
        })
      
        
        // userConfigHandler.askIfFriendOnline(friendDetails['contact'])
        // userConfigHandler.sendMyOnlineStatus(friendDetails['contact'])
    }
}



eventBus.on(APP_EVENTS.READY,() => {renderSelectedFriendOnStartup()})

// Set the send message action
const SEND_MSG_CLS_NAME = ".send-message-action"
const SEND_MSG_INPUT_CLS_NAME = ".send-message-input"
function sendTextMessageAction(){
        const user = readData('selectedContactInfo')
        const sendMessageElement = query(SEND_MSG_CLS_NAME)
        if(user && sendMessageElement){
        sendMessageElement.addEventListener('click',function(event) {
        const input = query(SEND_MSG_INPUT_CLS_NAME);
        webSocket.sendTextMessage(input.value,user.contact)
        input.value = ``
    })
        }

     


}





// ON THE RUN



// FRIENDS ACTIONS

/**
 * Renders all the contacts in the list
 */

/**
 * Get the last person whom the user had a chat
 * Automatically set him as the selected one 
 */
function renderSelectedFriendOnStartup(){
    const selectedFriend = localStorage.getItem('selectedContactInfo')
    if(selectedFriend){
        selectClickedFriend(JSON.parse(selectedFriend))()
    }
}




// NOTIFICATIONS

/**
 * Notification will be pop up if the selected user does not match with the payload user
 * It will be deleted automatically after a certain time
 */
chatHandler.setNotificationHandler((data) => {
    visualHandler.showNewsMessageNotification(data)
})



// Define the events

// 1. KEYBOARD HANDLER
keyboardHandler.setOnEnter((event) => {
        const user = readData('selectedContactInfo')
        const input = query(SEND_MSG_INPUT_CLS_NAME);
        webSocket.sendTextMessage(input.value,user.contact)
        const data = {message:input.value}
        input.value = ``
        
        
})



document.querySelector(".chat-info").addEventListener('scroll',async (event) => {
    const ele = document.querySelector(".chat-info")

    if(ele.scrollTop === 0){
        eventBus.emit(MESSAGE_INTERACTIONS.LOAD_PREVIOUS_MESSAGES)
    }

    if(ele.scrollTop + ele.clientHeight >= ele.scrollHeight ){

    }

})






// RUN THE MAIN FUNCTIONS

// renderSelectedFriendOnStartup();
visualHandler.setOnFriendClicked(selectClickedFriend)
visualHandler.renderFriends()
sendTextMessageAction();


// Settings the visual handlers
clickHandler.initClickHandlers()



// Setting the modals
// visualHandler.modalHandler.registerModal('fileShare',query("#share-a-file"))
// visualHandler.modalHandler.showModal('fileShare')

fileHandler.init()

// query("dialog").showModal()


// INIT All MODALS
const FILE_INPUT_MODAL_TAG = "file-input-modal"
const FILE_SHARE_MODAL_CLS_NAME = ".file-share-dialog"

const CALL_DIALOG_MODAL_TAG = "call-dialog"
const CALL_DIALOG_CLS_NAME = ".call-dialog"

visualHandler.modalHandler.registerModal(FILE_INPUT_MODAL_TAG,query(FILE_SHARE_MODAL_CLS_NAME))
visualHandler.modalHandler.registerModal(CALL_DIALOG_MODAL_TAG,query(CALL_DIALOG_CLS_NAME))


visualHandler.modalHandler.setModalSize(FILE_INPUT_MODAL_TAG,{width:800,height:800})






const fileInputZone = query(".file-drop-zone")
// Utility function to prevent default browser behavior
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Preventing default browser behavior when dragging a file over the container
fileInputZone.addEventListener('dragover', preventDefaults);
fileInputZone.addEventListener('dragenter', preventDefaults);
fileInputZone.addEventListener('dragleave', preventDefaults);

fileInputZone.addEventListener('click',(event) => {
    document.getElementById("FILES-SHARE_INPUT").click()
})
fileInputZone.addEventListener('drop',(event) => {
    event.preventDefault()
    event.stopPropagation()
    fileInputZone.style.display = "none"
    const files = event.dataTransfer.files
     eventBus.emit(FILE_INTERACTIONS.FILE_SET_UPLOAD_PREVIEWS,files)
    // visualHandler.uploadFilePreviews(files)
    // fileHandler.setYetToUploadFiles(files)
})



// Set File Sending
const inputFilesElement = document.getElementById("FILES-SHARE_INPUT")
inputFilesElement.addEventListener('change',async (event) => {
    const files = event.target.files
    if(files.length > 0){
        eventBus.emit(FILE_INTERACTIONS.FILE_SET_UPLOAD_PREVIEWS,files)
    }


})


visualHandler.setLeftSideAppTab("1")

query(".go-back-to-friend-button").addEventListener('click',(event) => {
    query(".main-container").setAttribute('showMessages','false')
    setChatVisibility(false)
})


// eventBus.emit(APP_EVENTS.READY,true)



// Actions that repeats in a cycle
// setInterval(() => {
//     const {to} = getSelectedUsersID()
//     userConfigHandler.askIfFriendOnline(to)
// },10000)


// visualHandler.initPreviousDownloads()


async function initApp(){
    try{
        await fileHandler.init();
        await cryptoHandler.init();

        initMessageListener();
        initDataListener();
        initVisualListener();
        initCallListener();
        initFileListener();
        initUIListener();
        initClickListener();
        initDownloadListener();


    const selectedFriend = readData('selectedContactInfo')
    console.log("Okay now setting the friend",selectedFriend)
    if(selectedFriend){
        selectClickedFriend(selectedFriend)()
    }

    }catch(error){
        console.error("Failed to initialize app", error);
        // show error banner to user
    }
}

initApp();
