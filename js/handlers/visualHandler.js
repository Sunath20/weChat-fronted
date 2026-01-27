import { eventBus } from "../core/EventBus.js";
import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { FILE_CATEGORY_TYPES, fileTypeToCategory, println, query, sortDateKeys } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { fileHandler, FileHandler } from "./fileHandler.js";
import { Notification, setNotificationsToZero } from "./notification.js";
import { TabHandler } from "./tabHandler.js";
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES, VISUAL_EVENTS } from "../core/Actions.js"
import { getToday, tagBaseOnDate, todayAsEasyViewFormat } from "../utils/dateUtils.js";
import { resolveContacts, resolveNotifications } from "../core/store.js";
import { apiHandler } from "./requestHandling.js";
// import UIkit from "../lib/uikit.js"

// Message List
const HEIGHT_PER_MESSAGE = 100;
const MESSAGE_LIST_CLS_NAME = ".chat-info"


// Friend Details
const SELECTED_PERSON_INFO_CLS = ".contact-info"
const UPLOAD_PREVIEW_CONTAINER =".uploading-preview"

const FRIEND_LIST_CLS_NAME = ".friend-list"


// SELECTED FRIEND
const SELECTED_FRIEND_CURRENT_STATE_CLS_NAME = ".selected-user-current-state"




// CALL Details
const CALL_RECEIVER_NAME_CLS = ".call-receiver-name"
const CALL_RECEIVER_PHONE_CLS = ".call-receiver-contact"
const CALL_RECEIVER_STATE_CLS = ".call-receiver-state" 

const CALL_INCOMING_NAME_CLS = ".call-incoming-name"
const CALL_INCOMING_PHONE_CLS = ".call-incoming-phone"

const CALL_END_USERNAME_TEXT_CLS = ".call-ended-by-user"



// Dialog TAGS
const MODAL_TAG_CALL_DIALOG = "call-dialog"


// Tab TAGS
const TAB_CALL_TAG = "call-tag"
const TAB_LEFT_SIDE_APP_TAG = "left-side-app"

/**
 * Responsible for maintain render elements,delete and update elements
 */
export class VisualHandler {


  

    constructor(contacts=null,messageCount=0){
        this.messageCount = messageCount;
        this.contacts = contacts;
        this.modalHandler = new ModalHandler();
        this.tabHandler = new TabHandler()
        
        // Add the observer
        // Remove the observer as soon as it captures an event
        this.observer = new IntersectionObserver((entries,objs) => {
            for(let i = 0 ; i < entries.length;i++){
                if(entries[i].isIntersecting){
                    const seenMessageID = entries[i].target.getAttribute('messageid');
                    const time  = (new Date()).toUTCString()
                    eventBus.emit(MESSAGE_TYPES.SET_SEEN_MESSAGE,{messageID:seenMessageID,time});
                    objs.unobserve(entries[i].target)                    
                }
            }
        },{root:query("chat-info")})



        // Set the tabs
        // Setting the tabs
        this.tabHandler.registerTab(TAB_CALL_TAG, query(".call-dialog"))
        this.tabHandler.registerTab(TAB_LEFT_SIDE_APP_TAG,query(".left-side-of-app"))


        
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
     * Set the file handler
     * @param {FileHandler} handler 
     */
    setFileHandler(handler){
        this.fileHandler = handler;
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

    let text = payload.content

    if(payload.contentType === "File"){
        this.visualFileMessage(payload)
        text = JSON.parse(payload['content'])['fileName']
    }

    messageElement.className = `message message-by-${payload.fromUser ? 'user' : 'sender' }`

    if(payload.userReceivedAt){
        messageElement.setAttribute('delivered',"true")
    }

    if(payload.userRead){
        messageElement.setAttribute('read','true')
    }

    messageElement.setAttribute('messageID',payload.messageID)
    messageElement.innerHTML = `
        <div class="message-content-if"> </div>
        <h4>${text}</h4>
        <div class="message-content-if-after-name"> </div>
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



    visualFileMessage(payload){
        const fileOBJ = JSON.parse(payload.content); 
        const filePath = payload.messageID + "-"+fileOBJ['fileName']
        const mimeType = fileOBJ['mimeType']
        
        fileHandler.readFile(filePath).then(e => {

            // When the file is in the local storage
            if(e && e['fileBlob']){
                if(!mimeType)return;
                if(mimeType.includes("image")){
                    this.previewOfTheMessageImage(e['fileBlob'],payload.messageID)
                }else if(mimeType.includes("video")){
                    this.previewOfTheVideo(e['fileBlob'],payload.messageID)
                }else if(mimeType.includes("audio")){
                    this.previewOfTheAudio(e['fileBlob'],payload.messageID)
                }else if(mimeType.includes("pdf")){
                    this.previewOfThePDF(e['fileBlob'],payload.messageID)
                }
               
            }

            // File gonna retrieve from the server
            if(!e){
                 fileHandler.retrieveFileFromServer(
                    payload.roomId,
                    payload.messageID,
                    fileOBJ['fileName'],
                    fileOBJ['mimeType']
                ).then(x => {
                    if(x){
                        const fileName = `${payload.messageID}-${fileOBJ['fileName']}`
                        fileHandler.saveFile(fileName,x)
                        
                        if(!mimeType)return;
                        if(mimeType.includes("image")){
                            this.previewOfTheMessageImage(x,payload.messageID)
                        }else if(mimeType.includes("video")){
                            this.previewOfTheVideo(x,payload.messageID)
                        }else if(mimeType.includes("audio")){
                            this.previewOfTheAudio(x,payload.messageID)
                        }else if(mimeType.includes("pdf")){
                           this.previewOfThePDF(e['fileBlob'],payload.messageID)
                        }
                    }
                });
            }


        })
    }


    previewOfTheMessageImage(fileBlob,messageID){
                const messageElement = query(`.message[messageID="${messageID}"]`)
                if(!messageElement)return;
                const type = fileBlob.type
                const msg = messageElement.querySelector(".message-content-if")
                const img = document.createElement('img')
                img.src = URL.createObjectURL(fileBlob)
                msg.appendChild(img)
                
    }

    previewOfThePDF(fileBlob,messageID){
         const messageElement = query(`.message[messageID="${messageID}"]`)
         if(!messageElement)return;
                const type = fileBlob.type
                const msg = messageElement.querySelector(".message-content-if-after-name")
                const viewButton = document.createElement('button')
                viewButton.className = "uk-button uk-button-primary"
                viewButton.innerText = "View the pdf"
                viewButton.onclick = (event) => {
                 const pdfURL =  URL.createObjectURL(fileBlob)
                 window.open(pdfURL)
                }

                msg.appendChild(viewButton)
    }


    previewOfTheVideo(fileBlob,messageID){
        const messageElement = query(`.message[messageID="${messageID}"]`)
        if(!messageElement)return;
        const msg = messageElement.querySelector(".message-content-if")
        const video = document.createElement('video')
        video.src = URL.createObjectURL(fileBlob)
        video.controls = true;
        msg.appendChild(video)
    }


    previewOfTheAudio(fileBlob,messageID){
         const messageElement = query(`.message[messageID="${messageID}"]`)
         if(!messageElement)return;
        const msg = messageElement.querySelector(".message-content-if")
        const video = document.createElement('audio')
        video.src = URL.createObjectURL(fileBlob)
        video.controls = true;
        msg.appendChild(video)
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


    setCurrentFriendStatus(status){
        const stateSpan = query(SELECTED_FRIEND_CURRENT_STATE_CLS_NAME)
        stateSpan.innerText = status
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
    const numberOfNotifications = this.dataHandler.notifications[payload.from] //this.chatHandler.currentMessageContacts[payload['from']].messageCount
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
        const msg = tagBaseOnDate(messages)
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
    
        const element = this.updateMessageList(msg[0],true,true)
        root.appendChild(element)
    }



    /**
     * Update the previous messages
     * Load the previous messages
     * @param {*} date 
     * @param {*} messages 
     */
    updatePreviousMessage(messages,addAfter=false){

        if(!messages)return;

        let dateKeys = Object.keys(messages)
        dateKeys = sortDateKeys(dateKeys)
        
        for(let i = 0 ; i < dateKeys.length;i++){
            const filter = `.message-list[date="${dateKeys[i]}"]`
            
            let element = query(filter)
            const elementMessages = messages[dateKeys[i]].map(e => this.updateMessageList(e,true,true));

            if(element !== null && element !== undefined){          
                for(let j = 0; j < elementMessages.length;j++){
                    if(addAfter){
                        element.appendChild(elementMessages[j])
                    }else{
                        element.insertBefore(elementMessages[j],element.children[j])
                    }
                    
                }   
            }else{
                    const newMessageContainer = document.createElement('div')
                    newMessageContainer.className = 'message-list'
                    newMessageContainer.setAttribute('date',dateKeys[i])
                    const dateAdder = document.createElement('h4')
                    dateAdder.className = 'date-specifier'
                    dateAdder.innerText = dateKeys[i] === todayAsEasyViewFormat() ? "Today" : dateKeys[i]

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
       
        if(!message)return;
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
        this.setMessageDelivered(messageID)
        if(element){
            element.setAttribute('read','true')
        }
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
            
            let filePreviewElements = ''
            const fileType = fileTypeToCategory(file.type)

            if(fileType === FILE_CATEGORY_TYPES.IMAGE){
                const imgBlob = URL.createObjectURL(file)
                filePreviewElements += `<img src="${imgBlob}" width="300" height="300"/>`
            }else if(fileType === FILE_CATEGORY_TYPES.VIDEO){
                const fileBlob = URL.createObjectURL(file)
                filePreviewElements +=`
                <video src="${fileBlob}" controls> </video>
                `
            }else if(fileType === FILE_CATEGORY_TYPES.PDF){
                const fileBlob = URL.createObjectURL(file)
                filePreviewElements += `
                <embed src="${fileBlob}" type="application/pdf" width="100%" height="500px" />
                `
            }


            const template = `
               ${filePreviewElements}
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
            if(element){
                element.remove()
            }
            
        },timeout)
    }

    updateUploadProgress(payload){
        const {index,totalChunks,chunkIndex} = payload;
         const progressElement = query(`.file-share-progress[upload-index="${index}"]`)
         progressElement.max = totalChunks;
         progressElement.value = chunkIndex;

         if(totalChunks === chunkIndex){
            this.clearUploadFilePreviewContainer(index)
         }
    }

   
    
    
    /**
     * Clears the all file upload previews
     */
    clearFileUploadPreview(){
        query(".uploading-preview").innerHTML = ``
        query(".file-drop-zone").style.display = "grid"
    }


    setOnFriendClicked(selectClickedFriend){
        this.onFriendClicked =  selectClickedFriend;
        this.onFriendClicked = this.onFriendClicked.bind(this)
    }

    renderFriends(){
        // Get the friend list container and set set it to null
        const friendsContainer = query(FRIEND_LIST_CLS_NAME)
        friendsContainer.innerHTML = ``
    
        // Get the contacts from the storage
        let contacts = resolveContacts()
       
        // Define a template so we can loop it
        function template(details){
            const parentDiv = document.createElement('div')
            parentDiv.className = 'friend pointer'
            parentDiv.setAttribute('friend-contact',details.contact)
            parentDiv.onclick = this.onFriendClicked(details)
            parentDiv.innerHTML =`
                    
                    <div class="photo">
                        <img src="./img/userDefault.png"  alt="">
                    </div>
    
                    <div class="info">
                        <span>${details.name}</span>
                        <span class="friend-notification-counter uk-badge" notifications="${details.notifications || 0}" contact=${details.contact}>${details.notifications || 0}</span>
                    </div>
            
            
                    `
    
            
            return parentDiv;
    
    
    
        }
        const formatTemplate = template.bind(this)
        const notifications = resolveNotifications()
        if(!contacts)return;
        contacts.map(e => {
            e['notifications'] = notifications[e.contact]
            return formatTemplate(e)
        }
        ).forEach(e => {
            friendsContainer.appendChild(e)
        });
    
    }
    
    
    setFriendNotificationsToZero(contact){
        const badgeElement = query(`.friend-notification-counter[contact="${contact}"]`)

        if(badgeElement){
            badgeElement.innerText = 0;
            badgeElement.setAttribute('notifications',0)
        }
    }



    // Call Views

    initCallerDialogWithUserInfo(userInfo){
        const {name,contact,state} = userInfo;
        query(CALL_RECEIVER_NAME_CLS).innerText = name;
        query(CALL_RECEIVER_PHONE_CLS).innerText = contact;
        query(CALL_RECEIVER_STATE_CLS).innerText = state;
        this.tabHandler.showTab(TAB_CALL_TAG,'1')
        this.modalHandler.showModal(MODAL_TAG_CALL_DIALOG)
    }

    initCallReceiverDialogWithUserInfo(userInfo){
        const {name,contact} = userInfo
        query(CALL_INCOMING_NAME_CLS).innerText = name;
        query(CALL_INCOMING_PHONE_CLS).innerText = contact;
        this.setCallTab('2')
        this.openCallDialog()
    }

    openCallDialog(){
        this.modalHandler.showModal(MODAL_TAG_CALL_DIALOG)
    }

    setCallTab(index){
        this.tabHandler.showTab(TAB_CALL_TAG,index)
    }

    closeCallDialog(){
        this.modalHandler.hideModal(MODAL_TAG_CALL_DIALOG)
    }

    updateCallEndedBy(endedBy){
        query(CALL_END_USERNAME_TEXT_CLS).innerText = `Call ended by ${endedBy}`
    }


    setLeftSideAppTab(index){
        this.tabHandler.showTab(TAB_LEFT_SIDE_APP_TAG,index)
    }


    // Friends
    renderSelectedFriend(friendDetails){
        this.setCurrentFriend(friendDetails);
        // this.clearChat()
        this.setFriendNotificationsToZero(friendDetails.contact)
    }
}


class ModalHandler {
    
    constructor(){  
         this.modals = {}
         this.registerModal = this.registerModal.bind(this)
         this.showModal = this.showModal.bind(this)
         this.hideModal = this.hideModal.bind(this)
      }


    registerModal(name,element){
        this.modals[name] = element  
    }

    showModal(name){
        this.modals[name].showModal()
    }

    setModalSize(name,sizes){
        this.modals[name].style.width = sizes.width + "px"
        this.modals[name].style.height = sizes.height + "px"
    }

    hideModal(name){
        this.modals[name].close()
    }





   
}



export const visualHandler = new VisualHandler()