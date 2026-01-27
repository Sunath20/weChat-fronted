import { CALL_TYPES, MESSAGE_TYPES, STORE_EVENTS } from "./Actions.js";
import { DataHandlerMessageModel } from "../models.js";
import { getSelectedUsersID, readData, saveData, sortDateKeys } from "../utils.js";
import { VISUAL_EVENTS } from "./Actions.js";
import { eventBus } from "./EventBus.js";
import { dateToEasyViewFormat, tagBaseOnDate, todayAsEasyViewFormat } from "../utils/dateUtils.js";

class Store {

  constructor(initialState = {}) {
    this.state = initialState;
    this.previousState = this.state;
    this.listeners = [];
    this.conditionalListeners = []
  }

  getState() {
    return structuredClone(this.state);
  }

  setState(updater) {
    this.previousState = this.getState();
    updater(this.state);
    this.listeners.forEach(l => l(this.getState()));
    this.conditionalListeners.filter(e => e.condition(this.previousState,this.getState())).forEach((e) => {
      e.listener(this.getState());
    })
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  subscribeOn(filterFunc,listener){
    this.conditionalListeners.push({condition:filterFunc,listener})
  }
}

export function reformatMessages(){
  const messages = readData('messages')
  const contacts = Object.keys(messages)
  const newMessages = {}

  for(let i = 0 ; i < contacts.length;i++){
    newMessages[contacts[i]] = {}
  }

  let wantedUpdate = false;
  const dates = []

  for(let i = 0; i < contacts.length; i++){
      
      const contact = contacts[i]
      const contactMessages = messages[contact]

      if(Array.isArray(contactMessages)){
          wantedUpdate = true;
          const contactMSGModels = contactMessages.map(e => new DataHandlerMessageModel(e))
          const updatedMessages = tagBaseOnDate(contactMSGModels,false)

          for(let j = 0 ; j < updatedMessages.length;j++){
              const m = updatedMessages[j] 
              const {dateTag} = m
              const userMessages = newMessages[contact]
              if(!userMessages[dateTag]){
                userMessages[dateTag] = []
              }
              userMessages[dateTag].push(m)
              newMessages[contact] = userMessages
          }

      }

      
  }

  if(wantedUpdate){
    saveData('messages',newMessages)
  }

}

reformatMessages()

export const store = new Store({
  activeChat: null,
  messages: readData('messages') || [],
  contacts: readData('contacts') || [],
  connection: {},
  currentUser:readData('userDetails'),
  selectedUser:readData('selectedContactInfo'),
  roomIDs:readData('roomIDs') || {},
  currentRoomID:readData('currentRoomID') || null,
  callingContact:null,
  yetToUploadFiles:[],
  notifications:{}
});


export function resolveCurrentUser(){
  const user = store.getState()['currentUser']
  return user;
}

export function resolveSelectedUser(){
  const user = store.getState()['selectedUser']
  return user;
}

export function addLoadedMessagesToStore(payload){
  const {messages,contact}  = payload;
  const currentContact = store.getState().currentUser.contact
  const mappedMessages = tagBaseOnDate(messages.map(e => new DataHandlerMessageModel(e))).map(e => {
    e['friend'] = contact;
    e['fromUser'] = currentContact === e.sentById 
    return e;
  },false)

  store.setState((state) => {

    const friendMessages = state.messages[contact]

    mappedMessages.forEach(e => {
        const day = e['dateTag']
        
        if(!friendMessages[day]){
          friendMessages[day] = []
        }

        friendMessages[day].push(e)
    })

    state.messages[contact] = friendMessages
    return state;

  })


  // eventBus.emit(STORE_EVENTS.LOADED_MESSAGES_ADDED,mappedMessages)
  saveData('messages',store.getState().messages)
  return {messages:mappedMessages,contact};
}

export function addMessages(payload){
  try{
      const messages = Array.isArray(payload) ? payload : [payload]
      const {currentUser} = store.getState()

  const mappedMessages = tagBaseOnDate(messages.map(e => {
    const msg = new DataHandlerMessageModel(e)
    console.log(msg,e) 
    msg.fromUser = msg.sentById === currentUser.contact
    msg.friend = msg.fromUser ? e.to : e.from

    return msg;

  }),false)
  console.log("Setting on ",mappedMessages)

  store.setState((state) => {
    const messages = state.messages;

    mappedMessages.forEach(e => {
        const {friend,dateTag} = e;
        let userMessages = messages[friend]
        if(!userMessages)userMessages={}
        let dateMessages = userMessages[dateTag]
        if(!dateMessages)dateMessages=[]
        dateMessages.push(e)
        userMessages[dateTag] = dateMessages
        state.messages[friend] = userMessages
    })

    return state
  })

  saveData('messages',store.getState().messages)
  console.log("returning ",mappedMessages)
  return mappedMessages

  }catch(error){
    console.error(error)
  }

}

export function addNewMessageToStore(payload,friend=null){
    const msg = new DataHandlerMessageModel(payload)
    const {from} = friend || getSelectedUsersID()

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

export function addFileMessageToday(payload){
    const model = new DataHandlerMessageModel(payload.message)
  const currentUser = resolveCurrentUser()
  model.friend = model.sentById === currentUser.contact ? model.sentById : currentUser.contact
  model.from = payload.from
  model.fromUser = currentUser.contact === payload.from

  store.setState((currentState) => {
      let messages = currentState.messages[model.friend]
      if(!messages){
        messages = []
      }
      messages.push(model)
      currentState.messages[model.friend] = messages;
      return currentState
  })

  eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,model)
  saveData('messages',store.getState().messages)
}

export function addNewFileMessageToStore(payload){
  const model = new DataHandlerMessageModel(payload.message)
  const currentUser = resolveCurrentUser()
  model.friend = model.sentById === currentUser.contact ? model.sentById : currentUser.contact
  model.from = payload.from
  model.fromUser = currentUser.contact === payload.from

  store.setState((currentState) => {
      let messages = currentState.messages[model.friend]
      if(!messages){
        messages = []
      }
      messages.push(model)
      currentState.messages[model.friend] = messages;
      return currentState
  })

  eventBus.emit(STORE_EVENTS.MESSAGE_ADDED,model)
  saveData('messages',store.getState().messages)
}

export function updateMessageInStore(friend,messageID,changes){
    store.setState( (state) => {
      const friendMessages = state['messages'][friend]
      const dates = sortDateKeys(Object.keys(friendMessages))
      for(let i = 0 ; i < dates.length;i++){
        const specificDateMessages = friendMessages[dates[i]]

        const message = specificDateMessages.find(e => e.messageID === messageID)   
        if(message){
          const newMessage = {...message,...changes}
          const msgIndex = specificDateMessages.indexOf(message)
          specificDateMessages[msgIndex] = newMessage
          state['messages'][friend][dates[i]][msgIndex] = newMessage
        }
      
      }
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
    return contacts.find(e => e.contact === from) || {name:"No name",contact:from}
}

export function getCallingContact(){
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


export function setSelectedFriend(friendDetails){
    store.setState( (state) => {
        state['selectedUser'] == friendDetails;
        return state;
    })
     localStorage.setItem('selectedContactInfo',JSON.stringify(friendDetails))
}


export function setRoomID(friendContact,roomID) {
  store.setState((state) => {
    state['roomIDs'][friendContact] = roomID;
    return state;
  })

  const roomIDs = store.getState()['roomIDs']
  saveData('roomIDs',roomIDs)
}

export function resolveRoomID(friendContact){
  const roomIDs = store.getState()['roomIDs']
  return roomIDs[friendContact] || null 
}

export function setCurrentRoomID(roomID){
  store.setState((state) => {
    state['currentRoomID'] = roomID;
    return state;
  })
}

export function resolveMessages(contact){
  const messages = store.getState()['messages']
  return messages[contact] || []
}

export function addNotDeliveredMessages(payload){
  const {messages,contact}  = payload
  store.setState((state) => {
    state['messages'][contact].push(messages)
    return state;
  })

}


export function resolveContacts(){
  return store.getState().contacts
}

export function resolveNotifications(){
  return store.getState().notifications
}