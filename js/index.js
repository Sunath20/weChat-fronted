
// Import handlers
import { ChatHandler } from "./handlers/chatHandler.js"
import { ClickHandler } from "./handlers/clickHandler.js"
import {KeyBoardHandler} from "./handlers/keyboardHandler.js"
import { Notification, setNotificationsToZero } from "./handlers/notification.js"
import {WebSocketHandler,MessageHandler, MAIN_HANDLERS,APIHandler} from "./handlers/requestHandling.js"
import {VisualHandler} from "./handlers/visualHandler.js"

import { getContacts, println, query } from "./utils.js"

const webSocket = new WebSocketHandler()
const messageHandler = new MessageHandler()
const apiHandler = new APIHandler()
const chatHandler = new ChatHandler(apiHandler)
const notification = new Notification()
const keyboardHandler = new KeyBoardHandler()
const visualHandler = new VisualHandler()
const clickHandler = new ClickHandler()
messageHandler.setChatHandler(chatHandler);
messageHandler.setAPIHandler(apiHandler)


// Setting each handler one to another
visualHandler.setChatHandler(chatHandler)
visualHandler.setNotificationHandler(notification)



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

        visualHandler.setCurrentFriend(friendDetails);
        visualHandler.clearChat()

    
        localStorage.setItem('selectedContactInfo',JSON.stringify(friendDetails))
        webSocket.setTheRoomForSelected(friendDetails);
        
        // Get the messages then add them base on who sent it
        apiHandler.getMessagesOfTwoPersons(
            friendDetails['contact'],
            JSON.parse(localStorage.getItem('userDetails'))['contact']
        ).then(e => e.json()).then(e => {
            e.forEach(e => {
                visualHandler.updateMessageList({
                    message:e['content']
                },e['sentbyid'] !== friendDetails['contact'] )
            })
        })

        chatHandler.currentMessageContacts[friendDetails.contact] = {}

    }
}



// Set the send message action
const SEND_MSG_CLS_NAME = ".send-message-action"
const SEND_MSG_INPUT_CLS_NAME = ".send-message-input"
function sendTextMessageAction(){
    const user = JSON.parse(localStorage.getItem('selectedContactInfo'))
    
    query(SEND_MSG_CLS_NAME).addEventListener('click',function(event) {
        const input = query(SEND_MSG_INPUT_CLS_NAME);
        webSocket.sendTextMessage(input.value,user.contact)
        visualHandler.updateMessageList({message:input.value},true)
        input.value = ``
    })


}
messageHandler.setOnReceivedMessage(visualHandler.updateMessageList);





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
     const user = JSON.parse(localStorage.getItem('selectedContactInfo'))
        const input = query(SEND_MSG_INPUT_CLS_NAME);
        webSocket.sendTextMessage(input.value,user.contact)
        visualHandler.updateMessageList({message:input.value},true)
        input.value = ``
})



document.querySelector(".chat-info").addEventListener('scroll',(event) => {
    const ele = document.querySelector(".chat-info")
    if(ele.scrollTop === 0){
        println("Scroll is at the top")
    }

    if(ele.scrollTop + ele.clientHeight >= ele.scrollHeight ){
        println("Scroll at the bottom")
    }

})

// RUN THE MAIN FUNCTIONS

renderSelectedFriendOnStartup();
renderFriends();
sendTextMessageAction();