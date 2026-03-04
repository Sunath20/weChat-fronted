import { CALL_TYPES, MESSAGE_TYPES, STORE_EVENTS } from "./Actions.js";
import { DataHandlerMessageModel } from "../models.js";
import { getSelectedUsersID, readData, saveData, sortDateKeys } from "../utils.js";
import { VISUAL_EVENTS } from "./Actions.js";
import { eventBus } from "./EventBus.js";
import { dateToEasyViewFormat, tagBaseOnDate, todayAsEasyViewFormat } from "../utils/dateUtils.js";
import { DOWNLOADING_STATUS } from "./DownloadManager.js";

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
  if(!messages)return;
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
  notifications:{},
  callUserStream:null,
  callRemoteStream:null,
  chatVisible:false,
  downloads:readData('downloads') || {}
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
    msg.fromUser = msg.sentById === currentUser.contact
    msg.friend = msg.fromUser ? e.to : e.from

    return msg;

      }),false)
  

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

export function addLoadedMessages(messages,messageWith){  
  const currentUserID = resolveCurrentUser().contact
  let returningMessages = {}

  try{
      
    const mappedMessages = tagBaseOnDate(messages.map(e => {
      const msg = new DataHandlerMessageModel(e)
      msg.fromUser = msg.sentById === currentUserID
      msg.friend = msg.fromUser ? e.to : e.from

      return msg;

  }),false);

  store.setState((state) => {
    let currentGoingDate = null;
    let currentGoingMessages = []  

    for(let i = 0 ; i < mappedMessages.length;i++){

      if(!returningMessages[mappedMessages[i].dateTag]){
        returningMessages[mappedMessages[i].dateTag] = []
      }

      returningMessages[mappedMessages[i].dateTag].push(mappedMessages[i])

        if(!currentGoingDate){
          currentGoingDate = mappedMessages[i].dateTag;
          currentGoingMessages.push(mappedMessages[i]);
        }else if (currentGoingDate === mappedMessages[i].dateTag){
          currentGoingMessages.push(mappedMessages[i])
        }else {
          const latestMessages = state.messages[messageWith][currentGoingDate] || []
          state.messages[messageWith][currentGoingDate] = [...currentGoingMessages,...latestMessages]
          currentGoingDate = mappedMessages[i].dateTag
          currentGoingMessages = [mappedMessages[i]]
        }

      
    }

    const latestMessages = state.messages[messageWith][currentGoingDate] || [];
    state.messages[messageWith][currentGoingDate] = [...currentGoingMessages,...latestMessages]
    return state;
  })

  saveData('messages',store.getState().messages)

  eventBus.emit(STORE_EVENTS.LOADED_PREVIOUS_MESSAGES,{messageWith,messages:returningMessages})


  }catch(error){
    console.error(error)
  }



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
        state['selectedUser'] = friendDetails;

        state.notifications[friendDetails.contact] = 0;
        return state;
    })
     localStorage.setItem('selectedContactInfo',JSON.stringify(friendDetails))
     eventBus.emit(STORE_EVENTS.NOTIFICATION_COUNT_CHANGED,{friend:friendDetails.contact,count:0})
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


export function setCallStream(stream,localStream=true){
  store.setState((state) => {
      state[localStream ? 'callUserStream' : 'callRemoteStream'] = stream;
      return state;
  })
  
  eventBus.emit(STORE_EVENTS.CALL_LOCAL_STREAM_SET,stream)     
}

export function addNewNotification(payload){
    const {friend} = payload;
    let count = 0 ;
    store.setState((state) => {
      
      const notifications = state.notifications;
    
      if(!notifications[friend]){
        state.notifications[friend] = 0
      }
      state.notifications[friend] += 1;
      count = state.notifications[friend]
      return state;
      })

    eventBus.emit(STORE_EVENTS.NOTIFICATION_COUNT_CHANGED,{friend,count})
}

export function setChatVisibility(visible){
    store.setState((state) => {
        state['chatVisible'] = visible
        return state;
    })
}

export function resolveChatVisibility(){
  return store.getState()['chatVisible']
}



export function setContacts(contacts){
  store.setState((state) => {
    state['contacts'] = contacts
    return state;
  })
}

export function addNewContact(contactDetails){
  store.setState((state) => {
      state['contacts'].push(contactDetails)
      return state;
  })

  saveData('contacts',store.getState().contacts)
  eventBus.emit(STORE_EVENTS.NEW_CONTACT_ADDED,contactDetails)
}


export function addDownloadFile({roomID,messageID,fileName,mimeType}){
    store.setState( (state) => {
        state['downloads'][messageID] =  {roomID,messageID,fileName,mimeType,status:DOWNLOADING_STATUS.WAITING}
        return state;
    } )

    saveData('downloads',store.getState().downloads)
}

export function updateDownloadFileInfo(payload){
    store.setState( (state) => {
              let message =  state['downloads'][payload.messageID] || {}
              const payloadKeys = Object.keys(payload)
              for(let i = 0 ; i < payloadKeys.length;i++){
                message[payloadKeys[i]] = payload[payloadKeys[i]]
              }
              state['downloads'][payload.messageID]  = message
              return state;
    })

    saveData('downloads',store.getState().downloads)
}

export function removeDownloadFileInfo({messageID}) {

  store.setState( (state) => {
      let messages = state['downloads'];
      if(messages == null){return state;}
      delete messages[messageID]
      state['downloads'] = messages;
      return state;
  } )

}
export function setDownloadingStatus ({messageID,status}) {
  
    store.setState( (state) => {
        const message = state['downloads'][messageID]
        message['status'] = status;
        state['downloads'][messageID]  = message;
        return state;
    })

    saveData('downloads',store.getState().downloads);

}

export function getDownloadingInfo(messageID) {
  const state = store.getState()
  const downloadingFileMessages = state['downloads'] || {}
  return downloadingFileMessages[messageID]
}

export function getDownloadingFilesMeta(){
  return store.getState()['downloads'] || {}
}