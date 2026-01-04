import { DatabaseMessageModel, DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js"
import { isEmptyObject, println, readData, saveData } from "../utils.js"
import { DateHandler } from "./dateHandler.js"
import { APIHandler } from "./requestHandling.js";



/**
 * Handles the data in the application
 * Mostly use to handle chat and get them back without making request to the server
 */
export class DataHandler {

    constructor(){
        this.messages = readData('messages') || {}
    }


    /**
     * Set the api handler
     * @param {APIHandler} handler 
     */
    setAPIHAndler(handler){
        this.apiHandler = handler;
    }


    /**
     * set the data handler for formatting dates base on the dates
     * @param {DateHandler} handler 
     */
    setDateHandler(handler){
        this.dateHandler = handler;
    }

    /**
     * 
     * @param {DataHandlerMessageModel} data 
     */
    addMessage(data){
        const user = data.friend
        if(!this.messages[user] || isEmptyObject(this.messages[user])){
            this.messages[user] = []
        }
        this.messages[user].push(data)

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
        return this.dateHandler.tagBaseOnDate(messages)
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
            console.log(e.dateTag,e)
            if(!msgOBJ[renderTag]){
                msgOBJ[renderTag] = []
            }
            msgOBJ[renderTag].push(e)
        })

        return msgOBJ;
    }


    /**
     * Load the messages base on the last selected user and owner
     * @param {*} amount 
     */
    async loadPreviousMessages(amount=10){
        const getSelectedUser = readData('selectedContactInfo')
        const id = getSelectedUser.contact

        const currentUser = readData('userDetails')
        if(this.messages[id]){
            const message =  this.messages[id][0]
            const msgs = await this.apiHandler.loadPreviousMessages(
                [id,currentUser.contact],
                message.createdAt
            ).then(e => e.json()).then(e => {
                this.messages[id] = [...e.map(e => new DataHandlerMessageModel(e)),...this.messages[id]]
                console.log(this.messages[id])
                return this.formatLoadedMessages(e)
            })
            
            return msgs;
        }
    }


    formatLoadedMessages(messages){
        const currentUserId = readData('userDetails').id

        const newFormattedMessages = messages.map(e => new DatabaseMessageModel(e)).map(e => {
            e['fromUser'] = currentUserId === e.sentById
            const dataHandlerMessage = new DataHandlerMessageModel(e)
            return dataHandlerMessage
            }
        )

        const msgs = this.groupMessagesBaseOnDate(this.reformatMessages(newFormattedMessages))
        
        return msgs;
    }
}