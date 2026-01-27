import {FormattedDataHandlerMessageModel} from "../models.js"

const HOUR_TO_MILLE_SECONDS = 3600000
const MINUTE_TO_MILLIE_SECONDS =  60000
const SECOND_TO_MILLIE_SECONDS = 1000
const DAY_TO_MILLE_SECONDS = 86400000

/**
 * Turns the date into more readable format like 25 nov 2025
 * @param {string} date 
 */
export function dateToEasyViewFormat(date,todayAndYesterday=false){
        const dateOBJ = new Date(date);
        const month =  dateOBJ.getMonth() + 1;
        const day = dateOBJ.getDate()
        const year = dateOBJ.getFullYear()

        return day + "/" + month+ "/" + year
    }

export function tagBaseOnDate(messages,todayAndYesterday=true){
        const today = getToday()
        const tomorrow = getTomorrow(today)
        const yesterday = getYesterday(today)
        return messages.map(e => {
            const dateInfo = (new Date(e.createdAt))

            const date = dateInfo.getTime()

            let hours = dateInfo.getHours()
            let minutes = dateInfo.getMinutes()

            if(minutes < 10){
                minutes = "0" + minutes;
            }

            if(hours < 10){
                hours = "0" + hours
            }

            e['timeRenderTag'] = hours + ":" + minutes

            
            e['dateRenderTag'] = dateToEasyViewFormat(e.createdAt)
            
            
            return new FormattedDataHandlerMessageModel(e);

        })
}


/**
     * @param 
     * Returns the tomorrow date in millie second
     * @returns {Number}
     */
export function getTomorrow(today){
        return today + DAY_TO_MILLE_SECONDS;
    }

export function addZeroIf(num){
        if(num < 10){
            return "0" + num 
        }
        return num
    }

export function convertToLastSeenAt(date){
        const today = this.getToday()
        const formattedDate = (new Date(date))
        const time = formattedDate.getTime()
        const yesterday = this.getYesterday(today)
        if( today <= time){
            return this.addZeroIf(formattedDate.getHours()) + ":" + this.addZeroIf(formattedDate.getMinutes()) +" Today"
        }else if(yesterday <= time <today){
            return this.addZeroIf(formattedDate.getHours()) + ":" + this.addZeroIf(formattedDate.getMinutes()) +" Yesterday"
        }else{
            return "Offline"
        }
    }

export function getToday(){
        const time = Date.now()
        const dateInfo = new Date(time)

        const hours  = dateInfo.getHours()
        const minutes = dateInfo.getMinutes()
        const seconds = dateInfo.getSeconds()

        const today = time - (  (hours * HOUR_TO_MILLE_SECONDS) + (minutes * MINUTE_TO_MILLIE_SECONDS)  + (seconds * SECOND_TO_MILLIE_SECONDS) ) 
       return  today;
    }

export function getYesterday(today){
    return today - DAY_TO_MILLE_SECONDS
}

export function todayAsEasyViewFormat(){
    const time = (new Date())
    const date = time.getDate()
    const month = time.getMonth() + 1
    const year = time.getFullYear()

    return date + "/" + month + "/" + year
}