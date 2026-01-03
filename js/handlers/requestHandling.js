import { ChatHandler } from "./chatHandler.js"
import { matchActiveAndReceivedMessageContact, println } from "../utils.js"

const MESSAGE_TYPES = {
    'SEND':0,
    'CREATE_ROOM':1,
    'ROOM_CREATED':2,
    'ROOM_CREATED_FAILED':3,
    'MESSAGE_RECEIVED':4
}

export const USER_HANDLES = {
    'NEW_CONNECTION':0,
    'REMOVE_CONNECTION': 1,
}



export const MAIN_HANDLERS = {
    'USER_CONFIG':0,
    'FILE_SHARE':1,
    'MESSAGE':2,
}


function jsonFetch(url,metaData){
    metaData['headers'] = {"Content-Type": "application/json"}
    if(metaData['body'] && typeof(metaData['body']) !== "string"){
        metaData['body'] = JSON.stringify(metaData['body'])
    }

    console.log(url,metaData)
    return fetch(url,metaData)
}

export class WebSocketHandler {

    constructor(){
        // this.userDetails = {'name':"Sunath Thenujaya","contact":"+94702910864"}
        this.socket = new WebSocket('ws://localhost:3000')
        this.socket.onopen = this.onOpen.bind(this)
        this.socket.onmessage = this.onMessage.bind(this)
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
        const data = {
            mainHandler:MAIN_HANDLERS.USER_CONFIG,
            handlerOne:USER_HANDLES.NEW_CONNECTION,
            userID:this.userDetails.contact
        }
        this.untilOpens.push(JSON.stringify(data))
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
     * @param {*} data 
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
}




export class MessageHandler {


    constructor(){
        this.messageReceivedFunc = null;
        this.handlers = {
            [MESSAGE_TYPES.MESSAGE_RECEIVED]:this.onMessage.bind(this)
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
         const response = await this.apiHandler.sentMessageDelivered(payload['messageId'])
         const outputData = await response.json()
    }

}


/**
 * Handles the API calls 
 */
export class APIHandler {

    constructor(){
        this.serverBase = "http://localhost:3000"
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
     * @returns {Promise}
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
    sentMessageDelivered(message_id){
        const localPath = "/messages/message-delivered"
        const url = this.serverBase + localPath
        return jsonFetch(url,{
            method:"POST",
            body:{
                query:{
                    messageId:message_id
                },
                payload:{
                    receivedAt: (new Date()).toUTCString()
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


}