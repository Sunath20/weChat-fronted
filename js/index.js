
// Import handlers
import { ChatHandler } from "./handlers/chatHandler.js"
import { ClickHandler } from "./handlers/clickHandler.js"
import { DataHandler } from "./handlers/dataHandler.js"
import { DateHandler } from "./handlers/dateHandler.js"
import { FileHandler } from "./handlers/fileHandler.js"
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
const fileHandler = new FileHandler()



// Setting each handler one to another
messageHandler.setChatHandler(chatHandler);
messageHandler.setAPIHandler(apiHandler);
messageHandler.setDataHandler(dataHandler)
messageHandler.setVisualHandler(visualHandler)

visualHandler.setChatHandler(chatHandler)
visualHandler.setNotificationHandler(notification)
visualHandler.setDataHandler(dataHandler)

chatHandler.setDataHandler(dataHandler)
chatHandler.setVisualHandler(visualHandler)
chatHandler.setWebSocketHandler(webSocket)


dataHandler.setDateHandler(dateHandler)
dataHandler.setAPIHAndler(apiHandler)
dataHandler.setWebSocketHandler(webSocket)
dataHandler.setVisualHandler(visualHandler)

fileHandler.setAPIHandler(apiHandler)



// Passing arguments
const CHAT_SEND_TEXT_INPUT_CLS_NAME = ".text-input"
keyboardHandler.setElement(query(CHAT_SEND_TEXT_INPUT_CLS_NAME))


/**
 * Get all the contacts from the local storage
 */
const contacts = getContacts()
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
    let profiles = localStorage.getItem('contacts')
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
const FRIEND_LIST_CLS_NAME = ".friend-list"


// FRIENDS ACTIONS

/**
 * Renders all the contacts in the list
 */
function renderFriends(){
    // Get the friend list container and set set it to null
    const friendsContainer = query(FRIEND_LIST_CLS_NAME)
    friendsContainer.innerHTML = ``

    // Get the contacts from the storage
    let contacts = getContacts()
    
    // Define a template so we can loop it
    function template(details){
        const parentDiv = document.createElement('div')
        parentDiv.className = 'friend pointer'
        parentDiv.setAttribute('friend-contact',details.contact)
        parentDiv.onclick = selectClickedFriend(details)
        parentDiv.innerHTML =`
                
                <div class="photo">
                    <img src="./img/userDefault.png"  alt="">
                </div>

                <div class="info">
                    <span>${details.name}</span>
                    <span class="friend-notification-counter uk-badge" notifications="0" contact=${details.contact}>0</span>
                </div>
        
        
                `

        setNotificationsToZero(details.contact,chatHandler);
        return parentDiv;



    }

    contacts.map(e => template(e)).forEach(e => {
        friendsContainer.appendChild(e)
    });

}

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
        
        for(let i = 0 ; i < files.length;i++){
            const file = files[i]
            const progressElement = query(`.file-share-progress[upload-index="${i}"]`)
            
            await fileHandler.fileSendStart(file,(chuck,chucks) => {
                progressElement.max = chucks;
                progressElement.value = chuck;
            })

            visualHandler.clearUploadFilePreviewContainer(i)
        }

    }

    event.target.files = null;
    event.target.value = null;
})




// RUN THE MAIN FUNCTIONS

renderSelectedFriendOnStartup();
renderFriends();
sendTextMessageAction();


// Setting the modals
// visualHandler.modalHandler.registerModal('fileShare',query("#share-a-file"))
// visualHandler.modalHandler.showModal('fileShare')