import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { println, query, sortDateKeys } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { Notification } from "./notification.js";

// import UIkit from "../lib/uikit.js"

// Message List
const HEIGHT_PER_MESSAGE = 100;
const MESSAGE_LIST_CLS_NAME = ".chat-info"


// Friend Details
const SELECTED_PERSON_INFO_CLS = ".contact-info"
const UPLOAD_PREVIEW_CONTAINER =".uploading-preview"

/**
 * Responsible for maintain render elements,delete and update elements
 */
export class VisualHandler {


  

    constructor(contacts=null,messageCount=0){
        this.messageCount = messageCount;
        this.contacts = contacts;
        this.modalHandler = new ModalHandler();
        
        // Add the observer
        // Remove the observer as soon as it captures an event
        this.observer = new IntersectionObserver((entries,objs) => {
            for(let i = 0 ; i < entries.length;i++){
                if(entries[i].isIntersecting){
                    const seenMessageID = entries[i].target.getAttribute('messageid');
                    this.dataHandler.onSeenMessage(seenMessageID);
                    objs.unobserve(entries[i].target)                    
                }
            }
        },{root:query("chat-info")})
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

    if(payload.userReceivedAt){
        messageElement.setAttribute('delivered',"true")
    }

    if(payload.userRead){
        messageElement.setAttribute('read','true')
    }

    messageElement.setAttribute('messageID',payload.messageID)
    messageElement.innerHTML = `
        <h4>${payload.content}</h4>
        <h6>${payload.timeTag}</h6>
    ` 



    if(payload.fromUser){
        messageElement.innerHTML += `

         <span class="uk-margin-small-right" uk-icon="check"></span>
        `

        if(payload.userReceivedAt){
        messageElement.innerHTML += `
        <span class="uk-margin-small-right" uk-icon="check"></span>
        `
    }
    }

    if(!payload.fromUser && !payload.userRead){
        this.observer.observe(messageElement);
    }
    

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
     * Add messages To the chat info
     * Usually calls upon awaken the app or change of chat
     * @param {Object} messages 
     */
    addMessagesToTheView(messages){
        const messageKeys = Object.keys(messages)

        // Remove the special dates
        messageKeys.splice(messageKeys.indexOf("Today"),1);
        messageKeys.splice(messageKeys.indexOf("Yesterday"),1)
        this.drawBaseOnDate('Yesterday',messages['Yesterday'])
        this.drawBaseOnDate('Today',messages['Today'])
        delete messages['Yesterday']
        delete messages['Today']
        this.updatePreviousMessage(messages)
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
        if(msgs){
        
            msgs.forEach(e => {
            messageList.appendChild(this.updateMessageList(e,false,true))
            })
        }
    


        query(MESSAGE_LIST_CLS_NAME).appendChild(messageList)
    
    }

    /**
     * Either user receive or send message during the current day will be added
     * @param {DataHandlerMessageModel} payload 
     */
    addOneToday(payload){
        const messages = [payload]
        const msg = this.dataHandler.reformatMessages(messages)[0]
        let root = query('.message-list[date="Today"]')
        if(!root){
            const chatDetails = query(".chat-info")
            const messageList = document.createElement('div')
            messageList.className = 'message-list'
            messageList.setAttribute('date','Today')

            const titleDetails = document.createElement('h6')
            titleDetails.className = 'date-specifier'
            titleDetails.innerText = 'Today'

            root = messageList;

            messageList.append(titleDetails);
            chatDetails.append(messageList);


        }

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
            const element = query(filter)
            const elementMessages = messages[dateKeys[i]].map(e => this.updateMessageList(e,true,true));

            if(element != null || element != undefined){
                
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

    /**
     * Add messages after the current position
     * Usual does when the user turn off the phone and power back on
     * We want the messages in the conversation after the last message
     * Messages will be added just like the previous but in the other way
     * @param {*} messages 
     */
    updateLaterMessages(messages){
        const dateKeys = Object.keys(messages)
        sortDateKeys(dateKeys.map(e => e))

        for(let i = 0 ; i < dateKeys.length;i++){
            const filter = `.message-list[date="${dateKeys[i]}"]`
            const element = query(filter)
            const elementMessages = messages[dateKeys[i]].map(e => this.updateMessageList(e,true,true));

            if(element != null || element != undefined){
                
                for(let j = 0; j < elementMessages.length;j++){
                    element.appendChild(elementMessages[j])
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
                    chat.append(newMessageContainer)
                          
            }
        }
    }



    messageOnDelivery(messageId){
        query('.message')
    }


    /**
     * Set the message deliver in the ui
     * Add a span with icon check
     * @param {string} messageId  - message id
     */
    setMessageDelivered(messageId){
        const message = query(`.message[messageid="${messageId}"]`)
        const delivered = message.getAttribute('delivered') === "true"
        if(!delivered){
            const icon = document.createElement('span')
            icon.setAttribute('uk-icon',"icon: check")
            icon.setAttribute('delivered','true')
            message.appendChild(icon)
        }
   
    }



    /**
     * Change the message attribute in order to change check icon color
     * @param {string} messageID 
     */
    readMessage(messageID){
        const element = query(`.message[messageid="${messageID}"]`)
        element.setAttribute('read','true')
    }

     /**
     * Add the progress bars and file names for the files
     * @param {File[]} files 
     */
    uploadFilePreviews(files){
        const uploadContainer = query(UPLOAD_PREVIEW_CONTAINER)

        for(let i = 0 ; i < files.length;i++){
            const file = files[i]
            const element = document.createElement('div')
            element.className="upload-file-instance"
            element.setAttribute('upload-name',file.name)
            element.setAttribute('upload-index',i)
            const template = `
                <h3>${file.name}</h3>
                <progress class="uk-progress file-share-progress" upload-index="${i}" value="0" max="100"></progress>
            `
            element.innerHTML = template;
            uploadContainer.appendChild(element)
        }


    }

    clearUploadFilePreviewContainer(index,timeout=2000){
        setTimeout(() => {
            const element = query(`.upload-file-instance[upload-index="${index}"]`)
            element.remove()
        },timeout)
    }



}


class ModalHandler {
    
    constructor(){  
         this.modals = {}
      }


    registerModal(name,element){
        this.modals[name] = element  
    }

    showModal(name){
        if(!this.modals[name].className.includes("uk-open")){
            this.modals[name].className += " uk-open"
        }
    }

    hideModal(name){
        if(this.modals[name].className.includes("uk-open")){
            this.modals[name].className = this.modals[name].className.replace("uk-open")
        }
    }


   
}

