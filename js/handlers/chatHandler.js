import { SendMessageDeliveredPayload } from "../clientPayloads.js";
import { DataHandlerMessageModel, WebSocketMessageModel } from "../models.js";
import { getCurrentActiveContact, isEmptyObject, println, readData } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { Notification } from "./notification.js";
import { APIHandler,WebSocketHandler } from "./requestHandling.js";
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES } from "../core/Actions.js"
import { VisualHandler } from "./visualHandler.js";


export class ChatHandler {
    
    /**
     * 
     * @param {APIHandler} apiHandler 
     */
    constructor(apiHandler){
        this.currentMessageContacts = {}
        this.apiHandler = apiHandler;
        this.newMessage = this.newMessage.bind(this)
    }


    setNotificationHandler(handler){
        this.notificationHandler = handler;
    }

    /**
     * Set the data handler for use
     * @param {DataHandler} handler 
     */
    setDataHandler(handler){
        this.dataHandler = handler;
    }   

    /**
     * Set the visual handler
     * @param {VisualHandler} handler 
     */
    setVisualHandler(handler){
        this.visualHandler = handler;
    }

    /**
     * Set the web socket handler
     * @param {WebSocketHandler} handler 
     */
    setWebSocketHandler(handler){
        this.webSocketHandler = handler;
    }


/**
     * When a new message arrived this function will be called
     * @param {WebSocketMessageModel} payload 
     */
    newMessage(payload){
        console.log("New message was recevied ")
      
        const {from,message} = payload;

        // // Check object emptiness and set it to not null and add the message
        // if(isEmptyObject(this.currentMessageContacts[from])){
        //     this.currentMessageContacts[from] = {
        //         messageCount:0,
        //         messages:[]
        //     }
        // }
        // this.currentMessageContacts[from]['messages'].push({message});

        // Create the class . Easy access to fields
        const msg = new DataHandlerMessageModel(payload)
        const friend = payload['from']
        msg.friend = friend
        msg.fromUser = false;
        
        // Add the message . And the save it
        this.dataHandler.addMessage(msg);
        this.dataHandler.calculateLastMessageTimesIf()
        this.visualHandler.renderFriends()

       

        // Send the message delivered request to the server
        const user = getCurrentActiveContact();
        const inputPayload = new SendMessageDeliveredPayload()
         inputPayload.mainHandler = MAIN_HANDLERS.MESSAGE
         inputPayload.handlerOne = MESSAGE_TYPES.SET_MESSAGE_DELIVERED
         const time = (new Date()).toUTCString()
         inputPayload.time = time
         inputPayload.to = msg.friend
         inputPayload.messageID = msg.messageID

       

         this.webSocketHandler.socket.send(JSON.stringify(inputPayload))
        
         

        //  If the selected user is not the guy message from,notification will be pop up
        // Otherwise message will be added to message list
        if(user['contact'] !== from){
        
        if(!this.dataHandler.notifications[friend]){
            this.dataHandler.notifications[friend] = 1;
        }else{
            this.dataHandler.notifications[friend] += 1;
        } 

        this.notificationHandler(payload);
        
        }else{
            this.visualHandler.addOneToday(msg)
        }

    }

    /**
     * After the message created server feed back the message 
     * So we can have the messageID and createdAt fields
     * @param {*} payload 
     */
    ownMessageWithFeedBack(payload){
        const user = readData('selectedContactInfo')
        const msg = new DataHandlerMessageModel(payload)
        msg.fromUser =  true;
        this.dataHandler.addMessage(msg)
        const messages = this.dataHandler.reformatMessages([msg])
        this.visualHandler.addOneToday(messages[0])

    }
}