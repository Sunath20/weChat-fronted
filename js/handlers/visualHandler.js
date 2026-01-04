import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { println, query, sortDateKeys } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
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
     * Set the data handler
     * @param {DataHandler} handler 
     */
    setDataHandler(handler){
        this.dataHandler = handler;
    }

 
    /**
     * Update the messages in the current view
     * Not gonna render everything
     * Only the last item added will be rendered
     * @param {DataHandlerMessageModel} payload - Data given by the server or the browser(input and contact most of the time)
     * @param {Boolean} byUser - wether the message by user or not
     */
    updateMessageList(payload,byUser=false,onlyTemplate=false){
    this.messageCount += 1;

    const messageElement = document.createElement('div')
    messageElement.className = `message message-by-${payload.fromUser ? 'user' : 'sender' }`
    messageElement.innerHTML = `
        <h4>${payload.content}</h4>
        <h6>${payload.timeTag}</h6>
    ` 
    if(!onlyTemplate){
        document.querySelector(MESSAGE_LIST_CLS_NAME).appendChild(messageElement);
        document.querySelector(MESSAGE_LIST_CLS_NAME).scrollTop =  HEIGHT_PER_MESSAGE * this.messageCount;
    }else {
        return messageElement;
    }
    
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



    /**
     * @param {Object} messages 
     */
    addMessagesToTheView(messages){
        const messageKeys = Object.keys(messages)

        // Remove the special dates
        messageKeys.splice(messageKeys.indexOf("Today"),1);
        messageKeys.splice(messageKeys.indexOf("Yesterday"),1)
        this.drawBaseOnDate('Yesterday',messages['Yesterday'])
        this.drawBaseOnDate('Today',messages['Today'])
    }


    /**
     * Init the messages with the date
     * @param {*} date 
     * @param {*} msgs 
     */
    drawBaseOnDate(date,msgs){

        const messageList = document.createElement('div')
        messageList.className = "message-list"
        messageList.setAttribute('date',date)
        const header = document.createElement('h4')
        header.innerText = date;
        header.className = 'date-specifier'

        messageList.appendChild(header);

        msgs.forEach(e => {
            messageList.appendChild(this.updateMessageList(e,false,true))
        })


        query(MESSAGE_LIST_CLS_NAME).appendChild(messageList)
    
    }

    /**
     * 
     * @param {DataHandlerMessageModel} payload 
     */
    addOneToday(payload){
        const messages = [payload]
        const msg = this.dataHandler.reformatMessages(messages)[0]
        console.log(msg)
        const root = query('.message-list[date="Today"]')
        console.log(msg, " This is the new one")
        const element = this.updateMessageList(msg,true,true)
        root.appendChild(element)
    }

    /**
     * Update the previous messages
     * Load the previous messages
     * @param {*} date 
     * @param {*} messages 
     */
    updatePreviousMessage(messages){

        const dateKeys = Object.keys(messages)
        sortDateKeys(dateKeys.map(e => e))

        for(let i = 0 ; i < dateKeys.length;i++){
            const filter = `.message-list[date="${dateKeys[i]}"]`
            println(filter)
            const element = query(filter)
            const elementMessages = messages[dateKeys[i]].map(e => this.updateMessageList(e,true,true));

            console.log("This is the elementy ",element)
            if(element != null || element != undefined){
                console.log("These are the new ones")
                
                for(let j = 0; j < elementMessages.length;j++){
                    element.insertBefore(elementMessages[j],element.children[j])
                }   
                
                
            }else{
                    const newMessageContainer = document.createElement('div')
                    newMessageContainer.className = 'message-list'
                    newMessageContainer.setAttribute('date',dateKeys[i])
                    const dateAdder = document.createElement('h4')
                    dateAdder.className = 'date-specifier'
                    dateAdder.innerText = dateKeys[i]

                    newMessageContainer.append(dateAdder)
                    newMessageContainer.append(...elementMessages)

                    const chat = query('.chat-info')
                    chat.insertBefore(newMessageContainer,chat.children[0])
                          
            }
        }

        
    }



}

