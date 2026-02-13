import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js"
import { isEmptyObject, println, readData, saveData, sortDateKeys } from "../utils.js"
import { tagBaseOnDate } from "../utils/dateUtils.js";
import { DateHandler } from "./dateHandler.js"
import { APIHandler, WebSocketHandler } from "./requestHandling.js";
import { VisualHandler } from "./visualHandler.js";
import { apiHandler } from "./requestHandling.js";
import { resolveContacts, resolveCurrentUser, resolveMessages, resolveSelectedUser } from "../core/store.js";


/**
 * Handles the data in the application
 * Mostly use to handle chat and get them back without making request to the server
 */
export class DataHandler {

    constructor(){
        
        this.messages = readData('messages') || {}
        this.contacts = readData('contacts') || [];
        this.lastOnlineAt = readData('lastOnlineAt') || {}
        this.notifications = {}
        
        this.calculateLastMessageTimesIf = this.calculateLastMessageTimesIf.bind(this)
        this.calculateLastMessageTimesIf();
        
        this.updateMessage = this.updateMessage.bind(this)
        this.addMessage = this.addMessage.bind(this)
        this.updateDeliveredMessageTime = this.updateDeliveredMessageTime.bind(this)
    }

    /**
     * Redefine the contacts base on the last message in order to render in order
     */
    calculateLastMessageTimesIf(){
        if(this.messages && this.contacts){
            
            this.contacts = this.contacts.sort((a,b) => {
                
                const messagesOne = this.messages[a.contact]
                if(!messagesOne)return 1;

                const messagesTwo = this.messages[b.contact]
                if(!messagesTwo)return -1;

                const message1 = messagesOne[messagesOne.length-1]
                if(!message1)return 1;

                const message2 = messagesTwo[messagesTwo.length-1]
                if(!message2)return -1;
                            

                const dateOne = message1['createdAt'] || message1['createdat']
                const dateTwo = message2['createdAt'] || message2['createdat']
                
                return ((new Date(dateOne)).getTime() - (new Date(dateTwo)).getTime()) > 0 ? -1 : 1

            })
        }
    }




    /**
     * Set the api handler
     * @param {APIHandler} handler 
     */
    setAPIHAndler(handler){
        this.apiHandler = handler;
    }


    /**
     * set the visual handler
     * @param {VisualHandler} handler 
     */
    setVisualHandler(handler){
        this.visualHandler = handler;
    }


    /**
     * set the data handler for formatting dates base on the dates
     * @param {DateHandler} handler 
     */
    setDateHandler(handler){
        this.dateHandler = handler;
    }

    /**
     * Set the websocket handler
     * @param {WebSocketHandler} handler 
     */
    setWebSocketHandler(handler){
        this.webSocketHandler = handler;
    }

    /**
     * 
     * @param {DataHandlerMessageModel} data 
     */
    addMessage(data,save=true){
        const user = data.friend
        if(!this.messages[user] || isEmptyObject(this.messages[user])){
            this.messages[user] = []
        }
        this.messages[user].push(data)
        if(save){
            saveData('messages',this.messages)
        }
    }

    /**
     * Update the message data
     * Usually userRead,userReceivedAt,userReadAt will be updated
     * @param {string} from - person who send the text
     * @param {string} messageId  - id of the message
     * @param {Object} changes  - changes that you made
     */
    updateMessage(from,messageId,changes){
        const messages =  this.messages[from]
        const message = messages.filter(e => e.messageID === messageId)[0]
        const newMessage = {...message,...changes}
        const messageIndex = this.messages[from].indexOf(message)
        this.messages[from][messageIndex] = newMessage;
        saveData('messages',this.messages)
    }

    /**
     * Get the messages of the conversation with the other user
     * @param {string} id 
     * @returns {DataHandlerMessageModel[]}
     */
    getMessages(id){
        const messages = this.messages[id]
        return (!messages || isEmptyObject(messages)) ? null : messages
    }

    /**
     * Format the messages
     * Format the date and make add tags like yesterday or today
     * @param {DataHandlerMessageModel[]} messages 
     * @returns {FormattedDataHandlerMessageModel[]}
     */
    reformatMessages(messages){
        return tagBaseOnDate(messages)
    }

    /**
     * Return the object with date tags
     * 
     * @param {[ {renderTag:string,messages:FormattedDataHandlerMessageModel[]} ]} messages 
     */
    groupMessagesBaseOnDate(messages){
        const msgOBJ = {}

        messages.forEach(e => {
            const renderTag = e.dateTag
            if(!msgOBJ[renderTag]){
                msgOBJ[renderTag] = []
            }
            msgOBJ[renderTag].push(e)
        })

        return msgOBJ;
    }


    setLastSeenAt(user,date){
        this.lastOnlineAt[user] = date;
        saveData('lastOnlineAt',this.lastOnlineAt)
    }


    /**
     * Load the messages base on the last selected user and owner
     * @param {*} amount 
     */
    getLastMessage(){
       
        const getSelectedUser = resolveSelectedUser()
        const id = getSelectedUser.contact

        const messages = resolveMessages(id)
        const dateKeys = sortDateKeys(Object.keys(messages))
        const lastDate = dateKeys[dateKeys.length - 1]
        const dateMessages = messages[lastDate]
        return dateMessages[0]
    }

    /**
     * Format the messages base on date tags
     * @param {*} messages 
     * @returns 
     */
    formatLoadedMessages(messages){
        const currentUserId = readData('userDetails').contact

        const newFormattedMessages = messages.map(e => new DatabaseMessageModel(e)).map(e => {
            e['fromUser'] = currentUserId === e.sentById
            const dataHandlerMessage = new DataHandlerMessageModel(e)
            return dataHandlerMessage
            }
        )

        const msgs = this.groupMessagesBaseOnDate(this.reformatMessages(newFormattedMessages))
        
        return msgs;
    }


    /**
     * Get the messages that was not set as delivered to the user
     * Send the request to update them
     * @param {*} from 
     * @returns 
     */
    updateNotDeliveredMessages(from){
        const messages = this.messages[from];
        if(!messages)return;
        const deliveredTime = (new Date()).toUTCString()
        const messageIDList = []
        for(let i = 0 ; i < messages.length ; i++ ){
            const message = messages[i]
            if( (!message['userReceivedAt'] && !message.fromUser) ){
                    messageIDList.push(message.messageID)
            }
        }
        
       if(messageIDList.length > 0 ){
            this.webSocketHandler.sendSetDeliveredMessages(messageIDList,from,deliveredTime);
       }


    //    saveData('messages',this.messages)
        

    

    }

    /**
     * Receive the event of `updateNotDeliveredMessage` function output from the other side
     * Updates the deliveredAt real time
     * @param {*} from 
     * @param {*} messageIdList 
     * @param {*} deliveredTime 
     */
    updateDeliveredMessageTime(from,messageIdList,deliveredTime){
        const messages = this.messages[from]

        for(let i = 0 ; i < messages.length;i++){
            const message = messages[i]
            const messageIndex = messageIdList.indexOf(message.messageID)
            if(messageIndex > -1){
                this.messages[from][i].userReceivedAt = deliveredTime;
            }

        }
        saveData('messages',this.messages);
    }

    /**
     * Get the messages that weren't registered as userRead or userDeliveredAt
     * Check if the other user read the messages and the messages were delivered to him
     * @param {*} from 
     * @returns 
     */
    loadDeliveredAndSeenMessageTimesIf(from){
        const messages = this.messages[from]
        const IDList = []

        for(let i = 0 ; i < messages.length;i++){
            if(!messages[i]['userReceivedAt'] || !messages[i]['userRead']){
                IDList.push(messages[i].messageID)
            }
        }


        return this.apiHandler.loadMessageDeliveredTimesIf(IDList).then(e => e.json())
    }

    /**
     * Triggers when the message observer capture the event
     * Set the seen time to the server
     * Server give to the other client
     * @param {*} messageID 
     */
    onSeenMessage(messageID){
        const time  = (new Date()).toUTCString()
        const selectedFriendID = readData('selectedContactInfo').contact;
        
        this.webSocketHandler.sendSeenMessage(messageID,selectedFriendID,time);
        this.updateMessage(
            selectedFriendID,
            messageID,
            {userRead:true,userReadMessageAt:time}
        );

        this.visualHandler.readMessage(messageID)


    }


    filterContacts(query){
        const contacts = resolveContacts()
        
        const exact = []
        const startsWith = []
        const includes = []
        const filter = query.toLowerCase()
        for(const contact of contacts){
            const name  = contact.name.toLowerCase()
            if(name === filter){
                exact.push(contact)
            }else if(name.startsWith(filter)){
                startsWith.push(contact)
            }else if(name.includes(filter)){
                includes.push(contact)
            }
        }

        
        
        return [...exact,...startsWith.sort(),...includes.sort()]

    }
}


export const dataHandler = new DataHandler();