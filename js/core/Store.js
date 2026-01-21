import { CALL_TYPES, MESSAGE_TYPES, STORE_EVENTS } from "./Actions.js";
import { DataHandlerMessageModel } from "../models.js";
import { getSelectedUsersID, readData, saveData } from "../utils.js";
import { VISUAL_EVENTS } from "./Actions.js";
import { eventBus } from "./EventBus.js";

class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  getState() {
    return structuredClone(this.state);
  }

  setState(updater) {
    updater(this.state);
    this.listeners.forEach(l => l(this.getState()));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const store = new Store({
  activeChat: null,
  messages: readData('messages') || [],
  contacts: readData('contacts') || [],
  connection: {},
  callingContact:null,
  yetToUploadFiles:[]
});


export function addNewMessageToStore(payload){
    const msg = new DataHandlerMessageModel(payload)
    const {from} = getSelectedUsersID()

    msg.friend = msg.sentById === from ? msg.sentById : from
    msg.from = payload.from
    msg.fromUser = msg.sentById === from

  store.setState( (state) => {
  

      let messages = state.messages[msg.friend]
      if(!messages){
        messages = []
      }
      messages.push(msg)
      state.messages[msg.friend] = messages;

      return state;
  })

  eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,msg)
  saveData('messages',store.getState().messages)

}

export function updateMessageInStore(friend,messageID,changes){
    store.setState( (state) => {
      const message = state['messages'][friend].filter(e => e.messageID === messageID)[0]
      const changeIndex = state['messages'][friend].indexOf(message)
      const newMessage = {...message,...changes}
      state['messages'][friend][changeIndex] = newMessage
      return state;
    })

    saveData('messages',store.getState()['messages'])
}


export function setCallingContact(contact){
  store.setState(state => {
    state['callingContact'] = contact
    return state
  })  
}
export function resolveCallingContact(payload){
    const {from} = payload
    const contacts = store.getState().contacts
    console.log("Resolving the contact ",contacts,from)
    return contacts.find(e => e.contact === from) || {name:"No name",contact:from}
}

export function getCallingContact(){
  console.log("State before getting the contact",store.getState())
  return store.getState().callingContact
}



export function setUploadFiles(files){
  store.setState((state) => {
    state['yetToUploadFiles'] = files;
    return state;
  })
}

export function getUploadingFiles(){
  return store.getState()['yetToUploadFiles']
}