import { getCurrentActiveContact, isEmptyObject } from "../utils.js";
import { APIHandler } from "./requestHandling.js";


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



    newMessage(payload){
        const {from,message} = payload;
        console.log(payload)
        console.log(from,this.currentMessageContacts[from] === null,isEmptyObject(this.currentMessageContacts[from]))
        if(isEmptyObject(this.currentMessageContacts[from])){
            this.currentMessageContacts[from] = {
                messageCount:0,
                messages:[]
            }
        }



        this.currentMessageContacts[from]['messages'].push({message});
        this.currentMessageContacts[from]['messageCount'] += 1;
        console.log(this.currentMessageContacts[from]['messageCount'] , " Thi is the coub")
        const user = getCurrentActiveContact();
        if(user['contact'] !== from){
            this.notificationHandler(payload);
        }

    }
}