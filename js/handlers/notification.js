import { ChatHandler } from "./chatHandler.js";
import { DataHandler } from "./dataHandler.js";

const H_POSITIONS = {LEFT:"LEFT",RIGHT:"RIGHT",CENTER:"CENTER"}
const V_POSITIONS = {TOP:"TOP",CENTER:"CENTER",BOTTOM:"BOTTOM"}


/**
 * Will be used pop up notifications
 */
export class Notification {

    static NOTIFICATION_OBJECTS = 0

    constructor(parentDiv=null,
        horizontalPosition=H_POSITIONS.RIGHT,
    verticalPosition=V_POSITIONS.BOTTOM){

        this.parentDiv = parentDiv;
        this.horizontalPosition = horizontalPosition;
        this.verticalPosition = verticalPosition;

        if(!this.parentDiv){
            this.parentDiv = document.body;
        }

        Notification.NOTIFICATION_OBJECTS += 1;

    }

    notify(innerContent,timeOut=5000,addHandlerFunctions){
        const plainDiv = document.createElement('div')
        plainDiv.className =  `notification`
        plainDiv.setAttribute('number',Notification.NOTIFICATION_OBJECTS);
        plainDiv.innerHTML = innerContent;
        plainDiv.style.position = "absolute"
        plainDiv.style.left = "0";
        plainDiv.style.bottom = "0"
        this.parentDiv.appendChild(plainDiv);

        setTimeout(() => {
            const element = document.querySelector(`.notification[number="${Notification.NOTIFICATION_OBJECTS}"]`)
            if(element){
                element.remove()          
            }
        },timeOut)


        addHandlerFunctions()

        this.currentNotification = plainDiv;

    }


    remove(){
        if(this.currentNotification){
            this.currentNotification.remove()
        }
    }



}



/**
 * Set the notification of the given number to zero
 * It will hide automatically.
 * Target - To be called when we select a friend set the notifications to zero.Also reset the notification in the chat handler.
 * @param {string} contactNumber - contact number of the user
 * @param {DataHandler} chatHandler  - chat handler instance
 */
export function setNotificationsToZero(contactNumber,dataHandler){
    dataHandler.notifications[contactNumber] = 0
}