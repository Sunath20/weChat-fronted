import { DataHandlerMessageModel, FormattedDataHandlerMessageModel } from "../models.js";
import { tagBaseOnDate } from "./dateUtils.js";

export function formatSavedMessages(messages){;

   const dateKeys = Object.keys(messages)
   dateKeys.forEach(e => {
        messages[e] = tagBaseOnDate(messages[e].map(x => {
           return new DataHandlerMessageModel(x)
        }),false).map(e => {
            return new FormattedDataHandlerMessageModel(e)})
   })

    return messages;
}

export function messageListToDateBase(messages){
   const msgOBJ = {}
   console.log(messages,"Gonna format them")
   for(let i = 0 ; i < messages.length;i++){
      const {dateTag} = messages[i]
      console.log(messages[i])
      if(!msgOBJ[dateTag]){
         msgOBJ[dateTag] = []
      }
      msgOBJ[dateTag].push(messages[i])
   }

   return msgOBJ

}