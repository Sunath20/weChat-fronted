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


export function convertToLastSeenAt(lastSeenAt){
    const date = new Date(lastSeenAt);
    const now = new Date();

    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if(diffMins < 1){
        return "Last seen just now";
    }else if(diffMins < 60){
        return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }else if(diffHours < 24){
        return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }else if(diffDays === 1){
        return `Last seen yesterday at ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    }else if(diffDays < 7){
        return `Last seen ${diffDays} days ago`;
    }else{
        return `Last seen on ${date.toLocaleDateString()}`;
    }
}
