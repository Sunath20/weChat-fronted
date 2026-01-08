const SELECTED_CONTACT_INFO_NAME = "selectedContactInfo"
const CONTACTS_INFO_NAME = "contacts"

const IS_PRODUCTION = false

export function getCurrentActiveContact(){
    return JSON.parse(localStorage.getItem(SELECTED_CONTACT_INFO_NAME))
}

export function setCurrentActiveContact(info){
    localStorage.setItem(SELECTED_CONTACT_INFO_NAME,JSON.stringify(info))
}


export function getContacts(){
    return JSON.parse(localStorage.getItem(CONTACTS_INFO_NAME))
}


export function matchActiveAndReceivedMessageContact(contact){
    return getCurrentActiveContact()['contact'] === contact;
}


// define short functions


/**
 * A shorter function for the document.querySelector
 * Argument still the same
 * @param {string} filter 
 * @returns 
 */
export function query(filter){
    return document.querySelector(filter)
}

/**
 * A short function for the document.querySelectorAll
 * Argument still the same
 * @param {string} filter 
 * @returns 
 */
export function queryAll(filter){
    return document.querySelectorAll(filter)
}


/**
 * Checks wether the object is {} or not
 * @param {Object} obj 
 * @returns 
 */
export function isEmptyObject(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === 0;
}




/**
 * Utility function that runs only in development mode
 * Use to console.log
 * @param  {...any} args 
 * @returns 
 */
export function println(...args){
    if(IS_PRODUCTION)return;
    console.log(...args)
}


/**
 * Read data from the local storage
 * @param {string} name - saved name for the data 
 * @param {boolean} jsonParse - parse the string if you want 
 * @returns 
 */
export function readData(name,jsonParse=true){
    const item =  localStorage.getItem(name)
    if(!item){return null;}
    return jsonParse ? JSON.parse(item) : item;
}

/**
 * Save the object in json format
 * @param {string} name - name you want to save as 
 * @param {object} obj - object you wanna save
 */
export function saveData(name,obj){
    localStorage.setItem(name,JSON.stringify(obj))
}

/**
 * Sort the date keys in order
 * @param {string[]} keys 
 */
export function sortDateKeys(keys){

    const todayIndex = keys.indexOf("Today")

    if(todayIndex > -1){
        keys.splice(todayIndex,1)
    }

    const yesterdayIndex = keys.indexOf("Yesterday")

    if(yesterdayIndex > -1){
        keys.splice(yesterdayIndex,1)
    }



}