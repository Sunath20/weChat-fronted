import { indexDBRequestToFunction } from "../utils.js";
import {DataHandlerMessageModel} from "../models.js";
import {tagBaseOnDate} from "../utils/dateUtils.js";
import {store} from "./Store.js";
import {cryptoHandler} from "../handlers/cryptoHandler.js";

const MESSAGE_DB_NAME = "MESSAGES_DB"
const MESSAGE_DB_VERSION = 4
const MESSAGES_STORE = "messages"
const toPromise = indexDBRequestToFunction

class MessageDB {

    constructor(){
        this.db = null;
        this.dbOkay = false;
        this.executions = [];
        this.executing = false;
        this.pendingRequests = [];
    }

    async init(){
        const dbRequest = indexedDB.open(MESSAGE_DB_NAME, MESSAGE_DB_VERSION);
        dbRequest.onupgradeneeded = (event) => {
            this.db = event.target.result;
            this.defineStructure();
        }
        const result = await toPromise(dbRequest);
        this.db = result.target.result;
        this.dbOkay = true;


        for(let i = 0; i < this.pendingRequests.length; i++){
            const {func, resolve} = this.pendingRequests[i];
            const result = await func();
            resolve(result);
        }
        this.pendingRequests = [];
    }

    // ---- queue system ----

    _queueOperation(func){
        return new Promise((resolve) => {

            if(!this.dbOkay){
                this.pendingRequests.push({func, resolve});
                return;
            }
            const onSuccess = (result) => resolve(result);
            const onError = () => resolve(null);
            this.addAnExecution(func, onSuccess, onError);
        });
    }

    addAnExecution(func, onSuccess, onError){
        this.executions.push({func, onSuccess, onError});
        this._execute();
    }

    _execute(){
        if(this.executing) return;
        if(this.executions.length !== 0){
            const {func, onSuccess, onError} = this.executions.shift();
            this.executing = true;
            func()
                .then((result) => onSuccess(result))
                .catch(() => onError())
                .finally(() => {
                    this.executing = false;
                    this._execute();
                });
        }
    }


    defineStructure(){
        if(!this.db.objectStoreNames.contains(MESSAGES_STORE)){
            const store = this.db.createObjectStore(MESSAGES_STORE, { keyPath: "messageID" });
            store.createIndex("friend", "friend", { unique: false });        // ✅ friend not friendID
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("friendCreatedAt", ["friend", "createdAt"], { unique: false }); // ✅
        }
    }

    getMessageStore(){
        this.messageStore = this.db.transaction([MESSAGES_STORE], 'readwrite').objectStore(MESSAGES_STORE);
    }

    // ---- queue system ----

    // ---- message operations ----

    saveMessages(messages){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const promises = messages.map(msg => toPromise(this.messageStore.put(msg)));
            await Promise.all(promises);
        });
    }

    getLatestMessages(friendID, limit=50){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const index = this.messageStore.index("friendCreatedAt");
            const range = IDBKeyRange.bound(
                [friendID, ""],
                [friendID, "\uffff"]
            );
            const request = index.openCursor(range, "prev");
            const results = [];

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if(cursor && results.length < limit){
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        results.reverse()
                        resolve(results); // oldest to newest
                    }
                }
                request.onerror = () => resolve([]);
            });
        });
    }

    getMessagesOlderThan(friendID, oldestDate, limit=50){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const index = this.messageStore.index("friendCreatedAt");
            const range = IDBKeyRange.bound(
                [friendID, ""],
                [friendID, oldestDate],
                false,
                true // exclude oldestDate itself
            );
            const request = index.openCursor(range, "prev");
            const results = [];

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if(cursor && results.length < limit){
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(results.reverse()); // oldest to newest
                    }
                }
                request.onerror = () => resolve([]);
            });
        });
    }

    updateMessage(messageID, changes){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const result = await toPromise(this.messageStore.get(messageID));
            const message = result.target.result;
            if(!message) return null;
            const updated = {...message, ...changes};
            await toPromise(this.messageStore.put(updated));
            return updated;
        });
    }

    deleteMessage(messageID){
        return this._queueOperation(async () => {
            this.getMessageStore();
            await toPromise(this.messageStore.delete(messageID));
        });
    }

    clearAll(){
        return this._queueOperation(async () => {
            this.getMessageStore();
            await toPromise(this.messageStore.clear());
        });
    }

    clearFriendMessages(friendID){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const index = this.messageStore.index("friendID");
            const range = IDBKeyRange.only(friendID);
            const request = index.openCursor(range);

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if(cursor){
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                }
                request.onerror = () => resolve();
            });
        });
    }

    getMessages(limit=50){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const request = this.messageStore.getAll(null, limit);
            const result = await toPromise(request);
            return result.target.result;
        });
    }


    getLastMessage(friendID){
        return this._queueOperation(async () => {
            this.getMessageStore();
            const index = this.messageStore.index("friendCreatedAt");
            const range = IDBKeyRange.bound(
                [friendID, ""],
                [friendID, "\uffff"]
            );
            const request = index.openCursor(range, "prev");

            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if(cursor){
                        resolve(cursor.value);
                    } else {
                        resolve(null);
                    }
                }
                request.onerror = () => resolve(null);
            });
        });
    }




}

export const messageDB = new MessageDB();


export async function addMessages(payload,currentUserContact,mapThem=true){
    if(!payload){throw new Error("Payload must be given for addMessages")}
    if(!currentUserContact){throw new Error("Payload must be given for currentUser contact")}

  try{
      const messages = Array.isArray(payload) ? payload : [payload]
      const mappedMessages = tagBaseOnDate( !mapThem ? messages :  messages.map(e => {
            const msg = new DataHandlerMessageModel(e)
            msg.fromUser = msg.sentById === currentUserContact
            msg.friend = msg.fromUser ? e.to : e.from
            return msg;

      }),false)

  await messageDB.saveMessages(mappedMessages)
  return mappedMessages

  }catch(error){
    console.error(error)
  }

}
export async function resolveLatestMessages(contactNumber,limit=30){
    const userKey = await cryptoHandler.loadFriendKey(contactNumber);
    const messages =  (await messageDB.getLatestMessages(contactNumber,limit))
    for(let i = 0; i < messages.length; i++){
        try{
            const decryptedMessage = await cryptoHandler.decryptMessage(JSON.parse(messages[i].content),userKey);
            messages[i].content = decryptedMessage;
        }catch{
            console.log("Probably not encrypted")
        }

    }
    return messages;
}
