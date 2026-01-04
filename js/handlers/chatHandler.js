import { DataHandlerMessageModel, WebSocketMessageModel } from "../models.js";
import { getCurrentActiveContact, isEmptyObject } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { APIHandler } from "./requestHandling.js";
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
     * 
     * @param {WebSocketMessageModel} payload 
     */
    newMessage(payload){
        const {from,message} = payload;
        if(isEmptyObject(this.currentMessageContacts[from])){
            this.currentMessageContacts[from] = {
                messageCount:0,
                messages:[]
            }
        }



        this.currentMessageContacts[from]['messages'].push({message});
    
        const msg = new DataHandlerMessageModel(payload)
        
        msg.friend = payload['from']
        msg.fromUser = false;
        
        this.dataHandler.addMessage(msg);
        console.log("This is the message ",msg)
        this.currentMessageContacts[from]['messageCount'] += 1;
        const user = getCurrentActiveContact();
        if(user['contact'] !== from){
            this.notificationHandler(payload);
        }else{
            console.log("This has to be called")
            this.visualHandler.addOneToday(msg)
        }

    }
}