
// Import handlers
import { ChatHandler } from "./handlers/chatHandler.js"
import { ClickHandler, UIClickHandler } from "./handlers/clickHandler.js"
import { DataHandler } from "./handlers/dataHandler.js"
import { DateHandler } from "./handlers/dateHandler.js"
import { FileHandler, WebFileHandler } from "./handlers/fileHandler.js"
import {KeyBoardHandler} from "./handlers/keyboardHandler.js"
import { Notification, setNotificationsToZero } from "./handlers/notification.js"
import {WebSocketHandler,MessageHandler, MAIN_HANDLERS,APIHandler} from "./handlers/requestHandling.js"
import {VisualHandler} from "./handlers/visualHandler.js"
import { DatabaseMessageModel, DataHandlerMessageModel } from "./models.js"

import { getContacts, println, query, readData } from "./utils.js"

const webSocket = new WebSocketHandler()
const messageHandler = new MessageHandler()
const apiHandler = new APIHandler()
const chatHandler = new ChatHandler(apiHandler)
const notification = new Notification()
const keyboardHandler = new KeyBoardHandler()
const visualHandler = new VisualHandler()
const dataHandler = new DataHandler()
const dateHandler = new DateHandler()
const fileHandler = new WebFileHandler()
const clickHandler = new UIClickHandler()



// Setting each handler one to another
messageHandler.setChatHandler(chatHandler);
messageHandler.setAPIHandler(apiHandler);
messageHandler.setDataHandler(dataHandler)
messageHandler.setVisualHandler(visualHandler)
messageHandler.setWebSocketHandler(webSocket)

visualHandler.setChatHandler(chatHandler)
visualHandler.setNotificationHandler(notification)
visualHandler.setDataHandler(dataHandler)
visualHandler.setFileHandler(fileHandler)

chatHandler.setDataHandler(dataHandler)
chatHandler.setVisualHandler(visualHandler)
chatHandler.setWebSocketHandler(webSocket)


dataHandler.setDateHandler(dateHandler)
dataHandler.setAPIHAndler(apiHandler)
dataHandler.setWebSocketHandler(webSocket)
dataHandler.setVisualHandler(visualHandler)

fileHandler.setAPIHandler(apiHandler)
fileHandler.setDataHandler(dataHandler)
fileHandler.setVisualHandler(visualHandler)
fileHandler.setWebSocketHandler(webSocket)


clickHandler.setVisualHandler(visualHandler)
clickHandler.setFileHandler(fileHandler)



// Passing arguments
const CHAT_SEND_TEXT_INPUT_CLS_NAME = ".text-input"
keyboardHandler.setElement(query(CHAT_SEND_TEXT_INPUT_CLS_NAME))


/**
 * Get all the contacts from the local storage
 */
const contacts = dataHandler.contacts;
visualHandler.contacts = contacts;

webSocket.setMainHandler(MAIN_HANDLERS.MESSAGE,messageHandler)


// SAVE NEW PROFILE
const saveNewProfileAction = query(".save-new-profile-button")
/**
 * Save the profile base on the input name and the phone number
 * Friends will be re render automatically
 * TODO - Instead of all friends add the new friend
 */
function saveNewProfile(){
    const nameInput = document.querySelector(".add-new-profile-name")
    const phoneInput = document.querySelector(".add-new-profile-contact")
    let profiles = dataHandler.contacts;
    const newProfile = {name:nameInput.value,contact:phoneInput.value}
    if(!profiles){
        profiles = [newProfile]
    }else{
        profiles = JSON.parse(profiles);
        profiles.push(newProfile)
    }

    localStorage.setItem('contacts',JSON.stringify(profiles))

    renderFriends()
}
saveNewProfileAction.addEventListener('click',saveNewProfile);




function selectClickedFriend(friendDetails){
    return () => {

        // Set the visual setup for the friend
        visualHandler.setCurrentFriend(friendDetails);
        visualHandler.clearChat()
        dataHandler.notifications[friendDetails.contact] = 0
        visualHandler.setFriendNotificationsToZero(friendDetails.contact)
    
        // Update the selected friend in the storage
        localStorage.setItem('selectedContactInfo',JSON.stringify(friendDetails))

        // Create a room if a room does not exist for selected two peoples
        webSocket.setTheRoomForSelected(friendDetails);

        // Get the messages from the storage
        const currentMessages = dataHandler.getMessages(friendDetails['contact'])
    
        if(!currentMessages){
             // Get the messages then add them base on who sent it
                apiHandler.getMessagesOfTwoPersons(
                    friendDetails['contact'],
                    readData('userDetails')['contact']
                ).then(e => e.json()).then(e => {
                    // e.forEach(e => {
                    //     const fromUser = e['sentbyid'] !== friendDetails['contact']
                    //     const dataHandlerObject = new DataHandlerMessageModel(e)
                    //     dataHandlerObject.fromUser = fromUser;
                    //     dataHandlerObject.friend = friendDetails['contact']
                    //     dataHandler.addMessage(dataHandlerObject);
                    //     visualHandler.updateMessageList(dataHandlerObject,fromUser);
                    // })

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
        }else{
            
            // Get the messages and reformat them into data handler messages
            const msgs = dataHandler.reformatMessages(currentMessages.map( (e) => {
                const model = new DataHandlerMessageModel(e)
                return model;
            } ))


            // Group the messages base on the dates
            const msgOBJ    = dataHandler.groupMessagesBaseOnDate(msgs)
            visualHandler.addMessagesToTheView(msgOBJ)

            // Load the not loaded delivered messages
            const lastMessage = msgs[msgs.length-1]
            apiHandler.loadNotDeliveredMessages(friendDetails.contact,lastMessage.messageID).then(e => e.json()).then(e => {
                

                const mappedMessages = e.map(x => {
                   const m = new DataHandlerMessageModel(x)
                   const fromUser = x['sentbyid'] !== friendDetails['contact'];
                   m.fromUser = fromUser;
                   m.friend = friendDetails['contact']
                   return m;
                })

                console.info("New Messages ",mappedMessages)

                mappedMessages.forEach(e => {
                    dataHandler.addMessage(e);
                })

                const formattedMessages = dataHandler.formatLoadedMessages(mappedMessages)
                visualHandler.updateLaterMessages(formattedMessages)

                dataHandler.updateNotDeliveredMessages(friendDetails['contact'])
                dataHandler.loadDeliveredAndSeenMessageTimesIf(friendDetails['contact']).then(e => {
                 
                    for(let i = 0 ; i < e.length;i++){
                        const msg = e[i]
                        
                        if(msg['userReceivedAt']){
                            
                            dataHandler.updateMessage(friendDetails['contact'],msg['messageID'],{userReceivedAt:msg['userReceivedAt']})
                            visualHandler.setMessageDelivered(msg['messageID'])
                        }

                        if(msg['userRead']){
                            dataHandler.updateMessage(friendDetails['contact'],msg['messageID'],{userRead:true,userReadMessageAt:msg['userReadMessageAt']});
                            visualHandler.readMessage(msg['messageID'])
                        }


                    }
                })
        })}
            
            
            // dataHandler.updateNotDeliveredMessages(friendDetails['contact'])

       

        chatHandler.currentMessageContacts[friendDetails.contact] = {}

    }
}



// Set the send message action
const SEND_MSG_CLS_NAME = ".send-message-action"
const SEND_MSG_INPUT_CLS_NAME = ".send-message-input"
function sendTextMessageAction(){
        const user = readData('selectedContactInfo')
        query(SEND_MSG_CLS_NAME).addEventListener('click',function(event) {
        const input = query(SEND_MSG_INPUT_CLS_NAME);
        webSocket.sendTextMessage(input.value,user.contact)
        // const data = {message:input.value}
        // const msg = new DataHandlerMessageModel({content:input.value,friend:user.contact,createdAt:(new Date()).toUTCString()})
        // msg.fromUser = true;
        // msg.friend = user.contact
        // visualHandler.updateMessageList(msg,true)
        // dataHandler.addMessage(msg)
        input.value = ``
    })


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
        // const msg = new DataHandlerMessageModel({
        //     content:input.value,friend:user.contact,createdAt:(new Date()).toUTCString()})
        
        // msg.fromUser = true;
        // msg.friend = user.contact

        // const updatedMessage = dataHandler.reformatMessages([msg])[0]

        // visualHandler.addOneToday(updatedMessage,true)
        // dataHandler.addMessage(msg)
        input.value = ``
        
        
})



document.querySelector(".chat-info").addEventListener('scroll',async (event) => {
    const ele = document.querySelector(".chat-info")

    if(ele.scrollTop === 0){
        const messages = await dataHandler.loadPreviousMessages(10)
        visualHandler.updatePreviousMessage(messages)
    }

    if(ele.scrollTop + ele.clientHeight >= ele.scrollHeight ){
        println("Scroll at the bottom")
    }

})


// Set File Sending
const inputFilesElement = document.getElementById("FILES-SHARE_INPUT")
inputFilesElement.addEventListener('change',async (event) => {
    const files = event.target.files
    if(files.length > 0){
        visualHandler.uploadFilePreviews(files)
        
        

    }

    event.target.files = null;
    event.target.value = null;
})




// RUN THE MAIN FUNCTIONS

renderSelectedFriendOnStartup();
visualHandler.setOnFriendClicked(selectClickedFriend)
visualHandler.renderFriends(selectClickedFriend)
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
visualHandler.modalHandler.registerModal(FILE_INPUT_MODAL_TAG,query(FILE_SHARE_MODAL_CLS_NAME))
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
    visualHandler.uploadFilePreviews(files)
    fileHandler.setYetToUploadFiles(files)
    console.log(files)
})