import { ChatHandler } from "./chatHandler.js"
import { getCurrentActiveContact, matchActiveAndReceivedMessageContact, println, readData } from "../utils.js"
import { DatabaseMessageModel, DataHandlerMessageModel } from "../models.js"
import { DataHandler } from "./dataHandler.js"
import { VisualHandler } from "./visualHandler.js"
import { MessageDeliveredPayload } from "../serverPayloads.js"
import { SendMessageDeliveredPayload } from "../clientPayloads.js"

export const MESSAGE_TYPES = {
    'SEND':0,
    'CREATE_ROOM':1,
    'ROOM_CREATED':2,
    'ROOM_CREATED_FAILED':3,
    'MESSAGE_RECEIVED':4,
    'SET_MESSAGE_DELIVERED':5,
    'MESSAGE_DELIVERED':6,
    'GET_BACK_CREATED_MESSAGE':7,
    'SET_LIST_OF_MESSAGE_DELIVERED':8,
    'RECEIVE_LIST_OF_MESSAGE_DELIVERED':9,
    'SET_SEEN_MESSAGE':10,
    'RECEIVE_SEEN_MESSAGE':11,
    'FILE_MESSAGE_SEND_TO_OTHER_USER':12,
    'FILE_MESSAGE_RECEIVE_TO_OTHER_USER':13,
}


export const USER_HANDLES = {
    'NEW_CONNECTION':0,
    'REMOVE_CONNECTION': 1,
}



export const FILE_TYPES = {
    'FILE_CREATE':0,
    'FILE_CHUCK_TO_SERVER':1,
    'FILE_CHUCK_TO_CLIENT':2,
    'FILE_CHUCK_FINISHED':3,
    'FILE_CREATED':4
}


export const CALL_TYPES = {
    'CALL_OFFER_CREATED':1,
    'CALL_OFFER_RECEIVED':2,
    'CALL_ANSWER_CREATED':3,
    'CALL_ANSWER_RECEIVED':4,
    'CALL_ICE_NEW_CANDIDATE_CREATED':5,
    'CALL_ICE_NEW_CANDIDATE_RECEIVED':6,
    'CALL_WAS_DISCONNECTED_BY_USER':7,
    'CALL_WAS_DISCONNECTED_BY_USER_RECEIVED':8
}

export const MAIN_HANDLERS = {
    'USER_CONFIG':0,
    'FILE_SHARE':1,
    'MESSAGE':2,
    'CALL':3
}


function jsonFetch(url,metaData){
    metaData['headers'] = {"Content-Type": "application/json"}
    if(metaData['body'] && typeof(metaData['body']) !== "string"){
        metaData['body'] = JSON.stringify(metaData['body'])
    }

    return fetch(url,metaData)
}

export class WebSocketHandler {

    constructor(){
        // this.userDetails = {'name':"Sunath Thenujaya","contact":"+94702910864"}
        this.socket = new WebSocket('wss://192.168.8.202:3000')
        this.socket.onopen = this.onOpen.bind(this)
        this.socket.onmessage = this.onMessage.bind(this)
        this.sendData = this.sendData.bind(this)
        this.untilOpens = []
        this.handlers = {}
        this.opened = false;
        this.userDetails = JSON.parse(localStorage.getItem('userDetails'))
        this.registerToTheNetwork();
        
    
    }

    setOnMessageReceived(){

    }

    setMainHandler(name,handler){
        this.handlers[name] = handler;
    }

    registerToTheNetwork(){
        if(!this.userDetails)return;
        const data = {
            mainHandler:MAIN_HANDLERS.USER_CONFIG,
            handlerOne:USER_HANDLES.NEW_CONNECTION,
            userID:this.userDetails.contact
        }
        this.untilOpens.push(JSON.stringify(data))
    }

    setHandleCallFunc(func){
        this.handlingCallFunc = func;
    }

    onOpen(){
        this.opened = true;

        for(let i = 0 ; i < this.untilOpens.length;i++){
            this.socket.send(this.untilOpens[i])
        }
    }

    /**
     * Mainly use my the web socket handler itself
     * If somehow our connection initialization take more time we can't send data.We will collect all the data in order than perform all the socket requests in the added order.
     * @param {string} data 
     */
    sendData(data){
        if(!this.opened){
            this.untilOpens.push(data)
        }else{
            this.socket.send(data)
        }
    }

    /**
     * Create a special room for two users.
     * Current web socket user and the selected user will be used
     * If we have a room it won't throw any error.It's just send us back that room has already created
     * @param {Object} selectedFriendDetail 
     */
    setTheRoomForSelected(selectedFriendDetail){
        const users = [this.userDetails.contact,selectedFriendDetail.contact].sort()
        const data = {
            'mainHandler':MAIN_HANDLERS.MESSAGE,
            'handlerOne':MESSAGE_TYPES.CREATE_ROOM,
            'from':users[0],
            'to':users[1]
        }

        const socketData = JSON.stringify(data);
        this.sendData(socketData)
    }

    /**
     * When a websocket message is received find the handler in registered handlers to handle the evnet
     * The handler will be chosen base on the mainHandler
     * @param {Object} event 
     */
    onMessage(event){
        // console.log(event.data,event)
        if(event.data instanceof Blob){
            // console.log("Received a blob file")
            const blobFile = new  Blob([event.data],{type:"audio/webm"})
            // console.log(blobFile, " This is the blob file")
            const file = URL.createObjectURL(blobFile)
            if(this.handlingCallFunc){
                // console.log(file, " This is our source")
                this.handlingCallFunc(file)
            }
            return;
        }

        const data = JSON.parse(event.data)
        if(data['mainHandler']){
            const handler = this.handlers[data['mainHandler']]
            handler.handle(data)
        }
    }

    /**
     * Sent a text message via the web socket connection
     * @param {String} message  - Message you wanna send
     * @param {String} to - contact number of the person 
     */
    sendTextMessage(message,to){
        const data = {
            mainHandler:MAIN_HANDLERS.MESSAGE,
            handlerOne:MESSAGE_TYPES.SEND,
            message:message,
            to:to,
            from:this.userDetails.contact
        }

        this.sendData(JSON.stringify(data));
    }


    /**
     * Set a bunch of messages to be delivered
     * @param {Array} messageIDList 
     * @param {string} to - the person user want to nofity 
     */
    sendSetDeliveredMessages(messageIDList,to,deliveredTime){
        
        const payload = {
            mainHandler:MAIN_HANDLERS.MESSAGE,
            handlerOne:MESSAGE_TYPES.SET_LIST_OF_MESSAGE_DELIVERED,
            to:to,
            messageIDList:messageIDList,
            deliveredTime
        }

        const socketPayload = JSON.stringify(payload)
        this.sendData(socketPayload)
    }

    /**
     * Set the seen to true in the database as well as send the data to the other user too
     * @param {string} messageID 
     * @param {string} to 
     * @param {string} seenTime 
     */
    sendSeenMessage(messageID,to,seenTime){
        const payload = {
            mainHandler:MAIN_HANDLERS.MESSAGE,
            handlerOne:MESSAGE_TYPES.SET_SEEN_MESSAGE,
            messageID:messageID,
            to:to,
            seenTime
        }

        this.sendData(JSON.stringify(payload))
    }
}




export class MessageHandler {


    constructor(){
        this.messageReceivedFunc = null;
        this.handlers = {
            [MESSAGE_TYPES.MESSAGE_RECEIVED]:this.onMessage.bind(this),
            [MESSAGE_TYPES.MESSAGE_DELIVERED]:this.onMessageDelivered.bind(this),
            [MESSAGE_TYPES.GET_BACK_CREATED_MESSAGE]:this.onOwnMessageSaved.bind(this),
            [MESSAGE_TYPES.RECEIVE_LIST_OF_MESSAGE_DELIVERED]:this.receiveListOfMessageDelivered.bind(this),
            [MESSAGE_TYPES.RECEIVE_SEEN_MESSAGE]:this.onSeenMessageReceived.bind(this),
            [MESSAGE_TYPES.FILE_MESSAGE_RECEIVE_TO_OTHER_USER]:this.onFileMessageReceiveByOtherUser.bind(this)
        }
    }

    /**
     * Set the api Handler 
     * @param {APIHandler} apiHandler 
     */
    setAPIHandler(apiHandler){
        this.apiHandler = apiHandler;
    }

    /**
     * Set the data handler
     * @param {DataHandler} dataHandler 
     */
    setDataHandler(dataHandler){
        this.dataHandler = dataHandler;
    }

    /**
     * Set the visual handler
     * @param {VisualHandler} visualHandler 
     */
    setVisualHandler(visualHandler){
        this.visualHandler = visualHandler;
    }

    /**
     * Set the Chat handler 
     * This will be used when a new message pop up
     * It will trigger new message event and notification events
     * UI Have methods to replace in chat handler in order to show notification and messages
     * @param {ChatHandler} handler 
     */
    setChatHandler(handler){
            this.chatHandler = handler;
    }

    /**
     * Set the web socket handler
     * @param {WebSocketHandler} webSocketHandler 
     */
    setWebSocketHandler(webSocketHandler){
        this.webSocketHandler= webSocketHandler;
    }

    /**
     * When a message is received from the connection this method will be called
     * The Function should consist of one argument(payload)
     * @param {function(payload)} func 
     */
    setOnReceivedMessage(func){
        this.messageReceivedFunc = func;
    }

    /**
     * Handle the message type . Especially wether we create the room , received a message 
     * Event will be trigger base on the handlerOne Input
     * @param {Object} payload 
     */
    handle(payload){
        if(payload['handlerOne'] && this.handlers[payload['handlerOne']]){
            this.handlers[payload['handlerOne']](payload)
        }
    }

    /**
     * A event to register when a new message arrived
     * Used to call the other event (from another classes)
     * @param {Object} payload 
     */
     async onMessage(payload){
        if(this.messageReceivedFunc && matchActiveAndReceivedMessageContact(payload['from'])){
            this.messageReceivedFunc(payload)
        }
        this.chatHandler.newMessage(payload)
        //  const response = await this.apiHandler.sentMessageDelivered(payload['messageId'])
        //  const outputData = await response.json()
    }

    /**
     * Call the function when the other user receive/download the message
     * not the reading just receiving
     * @param {MessageDeliveredPayload} payload 
     */
    onMessageDelivered(payload){
        println("Friends received the message " , payload)
            this.dataHandler.updateMessage(
                payload.from,
                payload.messageID,
                payload.changes
            );


            if(getCurrentActiveContact(payload.from)){
                this.visualHandler.setMessageDelivered(payload.messageID)
            }
    }

    /**
     * Call this function when the current message is saved
     */
    onOwnMessageSaved(payload){
        this.chatHandler.ownMessageWithFeedBack(payload)
    }

    /**
     * Receive the list of messages set as delivered on real time
     * @param {*} payload 
     */
    receiveListOfMessageDelivered(payload){
        const {messageIDList,from,deliveredTime} = payload;     
        this.dataHandler.updateDeliveredMessageTime(
            from,
            messageIDList,
            deliveredTime
        ) ;

        messageIDList.forEach(e => {
            this.visualHandler.setMessageDelivered(e)
        })

    }


    /**
     * On the other sees the message
     * Occur when other message captured with the observable event
     * @param {*} payload 
     */
    onSeenMessageReceived(payload){
        const {changes,from,messageID} = payload
        this.dataHandler.updateMessage(from,messageID,changes);
        this.visualHandler.readMessage(messageID);
    }

    /**
     * Runs when a file message request is created
     * @param {DataHandlerMessageModel} payload 
     */
    onFileMessageReceiveByOtherUser(payload){
     
        const {message,from} = payload;
        const msgOBJ = new DatabaseMessageModel(message)
        msgOBJ.from = from;
        msgOBJ.fromUser = false;
        msgOBJ.friend = from;

        this.dataHandler.addMessage(msgOBJ);
        this.visualHandler.addOneToday(msgOBJ)
        this.sendMessageDeliveredToOtherUser(msgOBJ.messageID,from)
    }

    /**
     * Send the message delivered
     * @param {*} payload 
     */
    sendMessageDeliveredToOtherUser(messageID,friend){
        
        const inputPayload = new SendMessageDeliveredPayload()
         inputPayload.mainHandler = MAIN_HANDLERS.MESSAGE
         inputPayload.handlerOne = MESSAGE_TYPES.SET_MESSAGE_DELIVERED
         const time = (new Date()).toUTCString()
         inputPayload.time = time
         inputPayload.to = friend
         inputPayload.messageID = messageID
         this.webSocketHandler.socket.send(JSON.stringify(inputPayload))
    }


    

}


/**
 * Handles the API calls 
 */
export class APIHandler {

    constructor(){
        this.serverBase = "https://192.168.8.202:3000"
    }

    /**
     * Fetch the messages from the database.
     * Room will identified by the users 
     * Person One and Two order does not matter.
     * It will sort anyway.
     * Returns the fetch request output.
     * We don't await.So you can get the status code.
     * @param {String} personOne 
     * @param {String} personTwo 
     * @returns {Promise<DatabaseMessageModel[]>}
     */
    getMessagesOfTwoPersons(personOne,personTwo,limit=20,skip=0){
        const localPath = "/messages/get-messages"
        const url = new URL(this.serverBase + localPath)
        const sortedPersons = [personOne,personTwo].sort()
        const filter = url.searchParams;
        filter.append('personOne',sortedPersons[0])
        filter.append('personTwo',sortedPersons[1])
        filter.append('limit',limit)
        filter.append('skip',skip)

        const fetchURL = url.toString()

       return fetch(fetchURL,{method:"GET"})
    }


    /**
     * Sign up a new User 
     * Save in the database and return a promise which consists of the updated user
     * Means createdAt,updatedAt fields are added.
     * @param {Object} payload 
     * @returns {Promise}
     */
    signUpRequest(payload){
        const localPath = "/users"
        
        return fetch(this.serverBase+localPath,{
            method:"POST",
            body:JSON.stringify(payload),
            headers:{
                 "Content-Type": "application/json",
            }
        })
    }

    /**
     * Generate a otp for a unique contact Number
     * Will be called when we wanna verify user identity
     * @param {*} contactNumber 
     * @returns 
     */
    generateOTPForUser(contactNumber){
        const localURL = "/users/verify-user"
        const url = this.serverBase + localURL;
        return jsonFetch(url,{
            method:"POST",
            body:JSON.stringify({contactNumber})
        })
    }

    /**
     * Since we are not saving otp in client side we call this function with the contact number
     * So the server does the matching.
     * return a promise (-> object with {match:true or false}) property
     * @param {String} contactNumber - authenticating person phone number 
     * @param {String} otp  - user input code
     * @returns 
     */
    checkOptValid(contactNumber,otp){
        const localURL = "/users/check-user-verification"
        const url = this.serverBase + localURL
        return jsonFetch(url,{
            method:"POST",
            body:JSON.stringify({contactNumber,otp})
        })
    }

    /**
     * Verify user sign up data is valid
     * Check for uniqueness and simple errors like minimum password length
     * @param {Object} payload 
     * @returns 
     */
    userOkayToBeSaved(payload){
        const localPath = "/users/valid-user"
        const url = this.serverBase + localPath;    
        return jsonFetch(url,{
            method:"POST",
            body:payload
        })
    }

    /**
     * When the receiver received the message we will set the receivedAt date
     * @param {string} message_id 
     * @returns 
     */
    sentMessageDelivered(message_id,time){
        const localPath = "/messages/message-delivered"
        const url = this.serverBase + localPath
        return jsonFetch(url,{
            method:"POST",
            body:{
                query:{
                    _id:message_id
                },
                payload:{
                    userReceivedAt: time
                }
            }
        })
    }


    setMessageRead(message_id){
        const localPath = "/messages/message-read"
        const url  = this.serverBase + localPath;

        return jsonFetch(url,{
            method:"POST",
            body:{
                query:{
                    messageId:message_id
                },
                payload:{
                    read:true,
                    readAt: (new Date()).toUTCString()
                }
            }
        })
    }


    /**
     * Load messages from past
     * contact has to be given
     * Messages will be load before a certain date and time
     * You can limit how many messages you want
     * @param {*} contacts 
     * @param {*} timeAndDate 
     * @param {*} limit 
     * @param {*} skip 
     * @returns 
     */
    loadPreviousMessages(contacts,timeAndDate,limit=10,skip=0){
        const localPath = "/messages/load-messages";
        const url = new URL(this.serverBase + localPath);

        const query = url.searchParams

        const [personOne,personTwo] = contacts.sort()
        
        query.set('personOne',personOne)
        query.set('personTwo',personTwo)
        query.set('lastTime',timeAndDate)
        query.set('limit',limit)
        query.set('skip',skip)

        const requestPath = url.toString()
        return jsonFetch(requestPath,{
            method:"GET"
        })
    }


    /**
     * Load the messages after a certain date or time
     * Usually when the user turn off the connection and revisit it
     * To avoid time errors we usually get the message from the message id and feed back database created time
     * @param {string} contact - chat person
     * @param {string} messageID - last message id
     * @returns 
     */
    loadNotDeliveredMessages(contact,messageID){
        const localPath = "/messages/load-new-messages"
        const url = new URL(this.serverBase + localPath)
        const parameters = url.searchParams

        const userDetails = readData('userDetails')
        const [personOne,personTwo] = [contact,userDetails.contact].sort()
        parameters.set('personOne',personOne)
        parameters.set('personTwo',personTwo)
        parameters.set('messageID',messageID)

        return jsonFetch(url.toString(),{method:"GET"})
    }


    /**
     * Load the messages userReceivedAt data with the time
     * A list contain a message id and time will return
     * @param {string} contact - friend id
     * @param {*} messageIDList 
     */
    loadMessageDeliveredTimesIf(messageIDList){
        const localPath = "/messages/get-message-deliver-times"
        const url = this.serverBase + localPath;
        return jsonFetch(url,{method:"POST",body:JSON.stringify({messageIDList:messageIDList})})
    }


    getServerBase(){return this.serverBase}


}