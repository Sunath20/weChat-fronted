import { DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { tagBaseOnDate } from "./dateUtils.js";

export function formatSavedMessages(messages){

    const mappedMessages = tagBaseOnDate(messages.map(x => {
           return new DataHandlerMessageModel(x)
        }),false).map(e => {
            return new FormattedDataHandlerMessageModel(e)})

    const obj = {}
    for(let i = 0 ; i < mappedMessages.length; i++){
        if(!obj[mappedMessages[i]['dateTag']]){
            obj[mappedMessages[i]['dateTag']] = [mappedMessages[i]];
        }else{
            obj[mappedMessages[i]['dateTag']].push(mappedMessages[i]);
        }
    }

    return obj;
}

export function messageListToDateBase(messages){
   const msgOBJ = {}
   for(let i = 0 ; i < messages.length;i++){
      const {dateTag} = messages[i]
      if(!msgOBJ[dateTag]){
         msgOBJ[dateTag] = []
      }
      msgOBJ[dateTag].push(messages[i])
   }

   return msgOBJ

}