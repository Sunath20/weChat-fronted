import { eventBus } from "../core/EventBus.js";
import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { FILE_CATEGORY_TYPES, fileTypeToCategory, println, query, sortDateKeys } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { fileHandler, FileHandler } from "./fileHandler.js";
import { Notification, setNotificationsToZero } from "./notification.js";
import { TabHandler } from "./tabHandler.js";
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES, VISUAL_EVENTS, FILE_EVENTS, REGISTER_EVENTS, CLICK_EVENTS, DOWNLOAD_INTERACTIONS } from "../core/Actions.js"
import { getToday, tagBaseOnDate, todayAsEasyViewFormat } from "../utils/dateUtils.js";
import { getDownloadingFilesMeta, getDownloadingInfo, resolveContacts, resolveNotifications } from "../core/Store.js";
import { apiHandler } from "./requestHandling.js";
import { messageListToDateBase } from "../utils/dataFormatting.js";
import {DOWNLOADING_STATUS, SERVER_BASE} from "../core/DownloadManager.js";
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



// DOWNLOADS
const DOWNLOAD_CLOSE_POP_UP_BTN_CLS_NAME = ".download-manager-close"
const DOWNLOAD_CONTAINER_CLS_NAME = ".download-manager"
const DOWNLOAD_MANAGER_BODY_CLS_NAME = ".download-manager-body"

// Dialog TAGS
const MODAL_TAG_CALL_DIALOG = "call-dialog"


// Tab TAGS
const TAB_CALL_TAG = "call-tag"
const TAB_LEFT_SIDE_APP_TAG = "left-side-app"
const TAB_FRIENDS_DETAILS = "friends-details-tab"




const DOWNLOAD_MANAGER_STATES = {
    MINIMIZED:"minimized",
    NORMAL:"normal",
    MAXIMIZED:"maximized"
}

/**
 * Responsible for maintain render elements,delete and update elements
 */
export class VisualHandler {


  

    constructor(contacts=null,messageCount=0){
        this.messageCount = messageCount;
        this.contacts = contacts;
        this.modalHandler = new ModalHandler();
        this.tabHandler = new TabHandler()
        this.downloadManagerState = DOWNLOAD_MANAGER_STATES.NORMAL;
        
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
        this.tabHandler.registerTab(TAB_FRIENDS_DETAILS,query(".friends-details-tab"))
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
        <h4 class="message-main-text">${text}</h4>
        <div class="message-content-if-after-name"> </div>
        <span class="message-time-tag">${payload.timeTag}</span>
    ` 



    if(payload.fromUser){
        messageElement.innerHTML += `

         <span uk-icon="icon: check; ratio: 0.5" class="message-deliver-info"></span>
        `

        if(payload.userReceivedAt){
        messageElement.innerHTML += `
        <span uk-icon="icon: check; ratio: 0.5" class="message-deliver-info" ></span>
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

        eventBus.emit(FILE_EVENTS.FILE_READ_LOCAL,{
                    roomID:payload.roomId,
                    messageID:payload.messageID,
                    fileName:fileOBJ['fileName'],
                    fileSize:fileOBJ['fileSize'],
                    mimeType
        })
        
        // fileHandler.readFile(filePath).then(e => {

        //     // When the file is in the local storage
        //     if(e && e['fileBlob']){
        //         if(!mimeType)return;
        //         if(mimeType.includes("image")){
        //             this.previewOfTheMessageImage(e['fileBlob'],payload.messageID)
        //         }else if(mimeType.includes("video")){
        //             this.previewOfTheVideo(e['fileBlob'],payload.messageID)
        //         }else if(mimeType.includes("audio")){
        //             this.previewOfTheAudio(e['fileBlob'],payload.messageID)
        //         }else if(mimeType.includes("pdf")){
        //             this.previewOfThePDF(e['fileBlob'],payload.messageID)
        //         }
               
        //     }

        //     // File gonna retrieve from the server
        //     if(!e){
        //          fileHandler.retrieveFileFromServer(
        //             payload.roomId,
        //             payload.messageID,
        //             fileOBJ['fileName'],
        //             fileOBJ['mimeType']
        //         ).then(x => {
        //             if(x){
        //                 const fileName = `${payload.messageID}-${fileOBJ['fileName']}`
        //                 fileHandler.saveFile(fileName,x)
                        
        //                 if(!mimeType)return;
        //                 if(mimeType.includes("image")){
        //                     this.previewOfTheMessageImage(x,payload.messageID)
        //                 }else if(mimeType.includes("video")){
        //                     this.previewOfTheVideo(x,payload.messageID)
        //                 }else if(mimeType.includes("audio")){
        //                     this.previewOfTheAudio(x,payload.messageID)
        //                 }else if(mimeType.includes("pdf")){
        //                    this.previewOfThePDF(e['fileBlob'],payload.messageID)
        //                 }
        //             }
        //         });
        //     }


        // })
    }


    addFilePreviewAfterLoading({messageID,fileName,file,mimeType,fromNetwork=false}){
        const blob = !fromNetwork ? file['fileBlob'] : file
        if(!mimeType){
            console.error("This one should rewrite - CASE No MIME TYPE FOR FILE")
            return;
        }

          if(mimeType.includes("image")){
            this.previewOfTheMessageImage(blob,messageID)
        }else if(mimeType.includes("video")){
            this.previewOfTheVideo(blob,messageID)
        }else if(mimeType.includes("audio")){
            this.previewOfTheAudio(blob,messageID)
        }else if(mimeType.includes("pdf")){
            this.previewOfThePDF(blob,messageID)
        }
               
    }

    addDownloadButtonForFile({roomID,messageID,fileName,mimeType}){
        const message = query(`.message[messageid="${messageID}"]`)
        const contentAfterName = message.querySelector('.message-content-if-after-name')
        const downloadButton = document.createElement('button')
        downloadButton.className = "uk-button uk-button-primary download-start-button"
        downloadButton.innerText = "Download"


        eventBus.emit(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,{
            element:downloadButton,
            event:FILE_EVENTS.FILE_ACCEPTED_DOWNLOAD_REQUEST,
            payload:{messageID,fileName,roomID,mimeType}
        })

        contentAfterName.append(downloadButton)
    }

    removeDownloadButtonForFile({mimeType,messageID,fileName,file}){
        const message = query(`.message[messageid="${messageID}"]`)
        const downloadButton = message.querySelector(".download-start-button")
        if(downloadButton){
            downloadButton.remove()
        }
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


    setCurrentFriendStatus(status){
        const stateSpan = query(SELECTED_FRIEND_CURRENT_STATE_CLS_NAME)
        stateSpan.innerText = status
    }

    /**
     * When a message received this function is responsible for making it appear in the ui
     * We will use chatHandler and notificationHandler to perform tasks like updateMessageCount and show the notification base on our inner html
     * @param {Object} payload 
     */
    showNewsMessageNotification(friend,count) {
        const notificationSpan =  query(`.friend-notification-counter[contact="${friend}"]`)
        const numberOfNotifications = 1
        if(!notificationSpan){return;}
        notificationSpan.setAttribute('notifications',count)
        notificationSpan.innerText = `${count}` 
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
        const msg = tagBaseOnDate(messages)[0]

        let root = query(`.message-list[date="${msg.dateTag}"]`)
        if(!root){
            const chatDetails = query(".chat-info")
            const messageList = document.createElement('div')
            messageList.className = 'message-list'
            messageList.setAttribute('date',msg.dateTag)

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
    updatePreviousMessage(messages,addAfter=false){

        if(!messages)return;

        let dateKeys = Object.keys(messages)
        dateKeys = sortDateKeys(dateKeys)
        
        for(let i = 0 ; i < dateKeys.length;i++){
            if(!dateKeys[i] || dateKeys[i] === "null")continue;
            const filter = `.message-list[date="${dateKeys[i]}"]`
            
            let element = query(filter)
            const elementMessages = messages[dateKeys[i]].map(e => this.updateMessageList(e,true,true));

            if(element !== null && element !== undefined){          
                for(let j = 0; j < elementMessages.length;j++){
                    if(addAfter){
                        element.appendChild(elementMessages[j])
                    }else{
                        element.insertBefore(elementMessages[j],element.children[j === 0 ? 1 : j])
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
            icon.className = 'message-deliver-info'
            icon.setAttribute('uk-icon',"icon: check; ratio: 0.5")
            icon.setAttribute('delivered','true')
            message.setAttribute('delivered','true')
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


    writeFriendTemplate(details){
            
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

    renderFriends(contactsE,nodeClass=FRIEND_LIST_CLS_NAME){

        // Get the friend list container and set set it to null
        const friendsContainer = query(nodeClass)
        friendsContainer.innerHTML = ``
    
        // Get the contacts from the storage
        let contacts = contactsE || resolveContacts()

       
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

    addNewContact(details){
        details['notifications'] = 0
        const friendsContainer = query(FRIEND_LIST_CLS_NAME)
        friendsContainer.appendChild(this.writeFriendTemplate(details))
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

    setFriendsDetailsTab(index){
        this.tabHandler.showTab(TAB_FRIENDS_DETAILS,index)
    }


    // Friends
    renderSelectedFriend(friendDetails){
             // Change the name of the user in selected field
        const container = document.querySelector(SELECTED_PERSON_INFO_CLS)  
        const nameSpan = container.querySelector(".text-info > span")
        nameSpan.innerText = friendDetails['name']


            try{
                fetch(SERVER_BASE+"/users/pic/"+friendDetails['contact']).then(async e => {
                    if(e.status === 404){return;}
               const file =  await e.blob();
                query(".user-profile-picture-image").src = URL.createObjectURL(file);
                })

            }catch (e){

            }

    }


    scrollToBottom(){
        const element = query(MESSAGE_LIST_CLS_NAME)
        requestAnimationFrame(() => {
            element.scrollTop = element.scrollHeight;
        })
    }


    setDownloadViewToFull(){
   
        const element = query(DOWNLOAD_CONTAINER_CLS_NAME)
        if(this.downloadManagerState === DOWNLOAD_MANAGER_STATES.MINIMIZED){
            element.classList.remove("minimize")
            this.downloadManagerState = DOWNLOAD_MANAGER_STATES.NORMAL;
        }else if(this.downloadManagerState === DOWNLOAD_MANAGER_STATES.NORMAL){
            element.classList.add("maximize")
            this.downloadManagerState = DOWNLOAD_MANAGER_STATES.MAXIMIZED;
        }      
       
    }


    minimizeDownloadView(){
        const element = query(DOWNLOAD_CONTAINER_CLS_NAME)

        if(this.downloadManagerState === DOWNLOAD_MANAGER_STATES.MAXIMIZED){
            element.classList.remove("maximize")
            this.downloadManagerState = DOWNLOAD_MANAGER_STATES.NORMAL;
        }else{
            this.downloadManagerState = DOWNLOAD_MANAGER_STATES.MINIMIZED;   
            element.classList.add("minimize")
        }


    }

    addNewFileToDownloadManager({roomID,messageID,fileName,mimeType}){
        const newElement = document.createElement('div')
        newElement.classList.add('download-item')
        newElement.setAttribute('id',messageID);

        const template = `


            <div class="download-item-main-content">

                    <div class="download-item-text">
                <h6 >${fileName}<span class="file-meta">(2min)</span></h6>
            </div>

            <div class="dm-actions tab-container" >
                    <!-- Start / Pause / Retry as tabs -->
                    <div class="tab-child" index="1" >
                        <button class="dm-btn start"><span class="material-symbols-outlined">play_arrow</span></button>
                    </div>
                    <div class="tab-child" index="2" style="display:none;">
                        <button class="dm-btn pause"><span class="material-symbols-outlined">pause</span></button>
                    </div>
                    <div class="tab-child" index="3">
                        <button class="dm-btn retry"><span class="material-symbols-outlined">autorenew</span></button>
                    </div>

                    <!-- Remove button separate -->
                    <button class="dm-btn remove">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
            </div>

        </div>

            <div class="download-item-meta-data">
                
                <div class="progress-container">
                        <div class="progress-bar" style="width: 20%"></div>
                </div>

            </div>
        
        
        `

        newElement.innerHTML = template;

        const body = query(DOWNLOAD_MANAGER_BODY_CLS_NAME)
        const child = body.children.length === 0 ? null : body.children[0]
        body.insertBefore(newElement,child)
        
        this.updateDownloadItemActionButtonsOnState(messageID,DOWNLOADING_STATUS.WAITING)

        eventBus.emit(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,{
            element:query(`.download-item[id="${messageID}"] > * button.pause`),
            payload:{messageID,fileName},
            event:DOWNLOAD_INTERACTIONS.PAUSE_DOWNLOAD_ITEM
        })
        console.log(query(`.download-item[id="${messageID}"] > * button.start`),"Found the element to attach the start button")
        eventBus.emit(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,{
            element:query(`.download-item[id="${messageID}"] > * button.start`),
            payload:{messageID,fileName},
            event:DOWNLOAD_INTERACTIONS.START_DOWNLOAD_FROM_PAUSED
        })

        eventBus.emit(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,{
            element:query(`.download-item[id="${messageID}"] > * button.retry`),
            payload:{messageID,fileName},
            event:DOWNLOAD_INTERACTIONS.RETRY_DOWNLOAD
        })

        eventBus.emit(REGISTER_EVENTS.REGISTER_BUTTON_CLICK,{
            element:query(`.download-item[id="${messageID}"] > * button.remove`),
            payload:{messageID,fileName},
            event:DOWNLOAD_INTERACTIONS.REMOVE_DOWNLOAD
        })
    
}

    updateDownloadingMetaInfo({fileID,downloadedChunks,downloaded,fileSize,messageID,fileName}){
        const downloadItem = query(`.download-item[id="${messageID}"]`)
        const progressBar = downloadItem.querySelector(".progress-bar")
        const progress = Math.floor((downloaded / fileSize)*100);
        progressBar.style.width = progress + "%";
    }

    removeDownloadFromManager(messageID){
        const downloadItem = query(`.download-item[id="${messageID}"]`)
        if(downloadItem){
            downloadItem.remove()
        }
    }


    updateDownloadItemActionButtonsOnState(messageID,state){

        const downloadItem = query(`.download-item[id="${messageID}"]`)
        if(!downloadItem){return;}
        const downloadActions = downloadItem.querySelector(".dm-actions")

        const startButton = downloadActions.querySelector(`.tab-child[index="1"]`)
        const pauseButton = downloadActions.querySelector(`.tab-child[index="2"]`)
        startButton.style.display = (state === DOWNLOADING_STATUS.WAITING || state === DOWNLOADING_STATUS.PAUSED) ? "flex" : "none";
        pauseButton.style.display = (state === DOWNLOADING_STATUS.DOWNLOADING) ? "flex" : "none";
    }

    initPreviousDownloads(){
        const downloads = getDownloadingFilesMeta()
        const messageIDList = Object.keys(downloads)
        for(let i = 0 ; i < messageIDList.length;i++){
            const {fileName,fileSize,downloaded,messageID,mimeType,roomID,status} = downloads[messageIDList[i]];
            if(status === DOWNLOADING_STATUS.PAUSED){
                console.log("Adding the file name ",fileName,downloads[messageIDList[i]])
                this.addNewFileToDownloadManager({roomID,messageID,fileName,mimeType})
                this.updateDownloadingMetaInfo({messageID,downloaded,fileSize})
            }
        }
    }


    // in visualHandler.js

    showChatLoading(){
        const chatInfo = query(MESSAGE_LIST_CLS_NAME);
        const loader = document.createElement('div');
        loader.className = 'chat-loading-overlay';
        loader.id = 'chat-loader';
        loader.innerHTML = `
        <div class="chat-loading-spinner">
            <span uk-spinner="ratio: 2"></span>
            <p>Loading messages...</p>
        </div>
    `;
        console.log("adding it ",chatInfo,loader)
        chatInfo.appendChild(loader);
    }

    hideChatLoading(){
        const loader = document.getElementById('chat-loader');
        if(loader) loader.remove();
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