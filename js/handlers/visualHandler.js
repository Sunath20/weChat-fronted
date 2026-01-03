import { query } from "../utils.js";
import { Notification } from "./notification.js";

// Message List
const HEIGHT_PER_MESSAGE = 100;
const MESSAGE_LIST_CLS_NAME = ".chat-info"


// Friend Details
const SELECTED_PERSON_INFO_CLS = ".contact-info"


/**
 * Responsible for maintain render elements,delete and update elements
 */
export class VisualHandler {

    constructor(contacts=null,messageCount=0){
        this.messageCount = messageCount;
        this.contacts = contacts;
    }

    /**
     * Since notifications are element of visual components,it must go through visual handler
     * This one has to pass down for pure management
     * @param {Notification} handler 
     */
    setNotificationHandler(handler){
        this.notificationHandler = handler;
    }

    /**
     * set the current chat handler
     * use to when user press enter to send message
     * @param {*} handler 
     */
    setChatHandler(handler){
        this.chatHandler = handler;
    }

 
    /**
     * Update the messages in the current view
     * Not gonna render everything
     * Only the last item added will be rendered
     * @param {Object} payload - Data given by the server or the browser(input and contact most of the time)
     * @param {Boolean} byUser - wether the message by user or not
     */
    updateMessageList(payload,byUser=false){
    this.messageCount += 1;
    const messageElement = document.createElement('div')
    messageElement.className = `message message-by-${byUser ? 'user' : 'sender' }`
    messageElement.innerHTML = `<h4>${payload.message}</h4>` 
    document.querySelector(MESSAGE_LIST_CLS_NAME).appendChild(messageElement);
    document.querySelector(MESSAGE_LIST_CLS_NAME).scrollTop =  HEIGHT_PER_MESSAGE * this.messageCount;
    }


    /**
     * Clear the chat in the selected person.
     * This will happen only visually
     * You must clear from chatHandler too
     */
    clearChat(){
        document.querySelector(MESSAGE_LIST_CLS_NAME).innerHTML = ``
    }


    /**
     * Paint the selected friend base on the current friendDetails
     * @param {Object} friendDetails 
     */
    setCurrentFriend(friendDetails){
            // Change the name of the user in selected field
        const container = document.querySelector(SELECTED_PERSON_INFO_CLS)  
        const nameSpan = container.querySelector(".text-info > span")
        nameSpan.innerText = friendDetails['name']
    }

    /**
     * When a message received this function is responsible for making it appear in the ui
     * We will use chatHandler and notificationHandler to perform tasks like updateMessageCount and show the notification base on our inner html
     * @param {Object} payload 
     */
    showNewsMessageNotification(payload) {
    
    const contact = this.contacts.filter(e => e.contact === payload['from'])
    const from = contact ? contact[0]['name'] : payload['from']
    const messageText = `
    <h4>Message from ${from}</h4>
    <button class="notification-close-button">Close</button>
    `

    /**
     * Select the button in the above template and add a event listener to remove the notification
     */
    function DeleteNotification(){
        query(".notification-close-button").addEventListener('click',(event) => {
            this.notificationHandler.remove()       
        })
    }
    this.notificationHandler.notify(messageText,5000,DeleteNotification);
    const notificationSpan =  query(`.friend-notification-counter[contact="${payload['from']}"]`)
    const numberOfNotifications = this.chatHandler.currentMessageContacts[payload['from']].messageCount
    notificationSpan.setAttribute('notifications',numberOfNotifications);
    notificationSpan.innerText = `${numberOfNotifications}` 
    }



}

