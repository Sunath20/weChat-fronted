import { fileHandler } from "../handlers/fileHandler.js";
import { apiHandler } from "../handlers/requestHandling.js";
import { DOWNLOAD_EVENTS, REQUEST_APP_DATA } from "./Actions.js";
import { eventBus } from "./EventBus.js";


export const DOWNLOADING_STATUS = {
    WAITING:"waiting",
    DOWNLOADING:"downloading",
    PAUSED:"paused",
    FINISHED:"finished"
}


class Node {
    constructor(value) {
        this.value = value;   // The data you want to store (e.g., file info)
        this.next = null;     // Pointer to the next node
        this.prev = null;     // Pointer to the previous node
    }
}



// Doubly Linked List class
class DoublyLinkedList {
    constructor() {
        this.head = null; // front of the queue
        this.tail = null; // end of the queue
        this.size = 0;
    }

    // Add to tail (enqueue)
    append(value) {
        const node = new Node(value);

        if (!this.head) { // empty list
            this.head = node;
            this.tail = node;
        } else {
            node.prev = this.tail;
            this.tail.next = node;
            this.tail = node;
        }

        this.size++;
        return node; // return node reference for potential removal later
    }

    // Remove from head (dequeue)
    removeHead() {
        if (!this.head) return null;

        const removedNode = this.head;
        if (this.head === this.tail) {
            this.head = null;
            this.tail = null;
        } else {
            this.head = this.head.next;
            this.head.prev = null;
        }

        removedNode.next = null; // clean up
        this.size--;
        return removedNode.value;
    }

    // Remove an arbitrary node (O(1))
    remove(node) {
        if (!node) return null;

        if (node === this.head) return this.removeHead();
        if (node === this.tail) {
            this.tail = this.tail.prev;
            this.tail.next = null;
            node.prev = null;
            this.size--;
            return node.value;
        }

        node.prev.next = node.next;
        node.next.prev = node.prev;
        node.prev = null;
        node.next = null;
        this.size--;
        return node.value;
    }

  // Remove a node by messageID
    removeById(messageID) {
        if (!messageID || !this.head) return null; // empty list or invalid ID

        // Check head
        if (this.head.value?.messageID === messageID) {
            const removed = this.head;
            this.head = this.head.next;
            if (this.head) this.head.prev = null;
            else this.tail = null; // list is now empty
            removed.next = null;
            this.size--;
            return removed.value;
        }

        // Check tail
        if (this.tail.value?.messageID === messageID) {
            const removed = this.tail;
            this.tail = this.tail.prev;
            if (this.tail) this.tail.next = null;
            else this.head = null; // list is now empty
            removed.prev = null;
            this.size--;
            return removed.value;
        }

        // Search middle nodes
        let current = this.head.next;
        while (current) {
            if (current.value?.messageID === messageID) {
                current.prev.next = current.next;
                if (current.next) current.next.prev = current.prev;
                current.next = current.prev = null;
                this.size--;
                return current.value;
            }
            current = current.next;
        }

        // Not found
        return null;
    }

    // Peek head without removing
    peek() {
        return this.head ? this.head.value : null;
    }

    isEmpty() {
        return this.size === 0;
    }

    print() {
        let current = this.head;
        const values = [];
        while (current) {
            values.push(current.value);
            current = current.next;
        }
        console.log(values);
    }
}


export class DownloadManager {
    
    constructor(downloadLimit=2){
        this.downloadLimit = downloadLimit;
        this.downloadingItems = new Map();
        this.activeDownloads = 0;
        this.queue = new DoublyLinkedList();
    }


    addFile(roomID,messageID,fileName,mimeType){
       this.queue.append({roomID,messageID,fileName,mimeType});
       eventBus.emit(DOWNLOAD_EVENTS.ADDED_TO_QUEUE,{roomID,messageID,fileName,mimeType});
       this._processQueue()
    }

    pauseDownload({fileName,messageID}){
        const fileID = this._getName(messageID,fileName)
        if(this.downloadingItems.has(fileID)){
            try{
                this.downloadingItems.get(fileID).abort('User cancelled the request')
            }catch(error){
                console.log("Download cancelled")
            }
            
        }
    }



    startFromPaused({messageID,fileName}){
        console.log("Emmiting request for ",messageID,fileName)
        eventBus.emit(REQUEST_APP_DATA.TEMP_FILE_INFO,{messageID,fileName})
    }

    acceptStartFromPaused({messageID,roomID,fileName,mimeType,downloaded}){
        try{
            
            const controller = new AbortController()
            const signal = controller.signal;
            const fileID = this._getName(messageID,fileName)
            fileHandler.retrieveFilePausedFromServer(roomID,
                messageID,
                fileName,
                downloaded,
                mimeType,
                this._downloadProgressCallback(messageID,fileName),
                signal
              
            ).then(e => {
                if(e){
                  console.log("This is the downloaded file",e)
                  this._onDownloadFinished(messageID,fileName,e,mimeType)
                }
                 
            })

            this.downloadingItems.set(fileID,controller)
            this.activeDownloads++;
        }catch(error){
            console.error(error)
        }
    }

    cancelDownload(messageID,fileName){
        const fileID = this._getName(messageID,fileName)
        const downloadingItem = this.downloadingItems.get(fileID)
        if(downloadingItem){
            this.downloadingItems.delete(fileID)
            this.activeDownloads--;
            downloadingItem.abort('User cancel the downloading process');
             eventBus.emit(DOWNLOAD_EVENTS.DOWNLOAD_CANCEL, { messageID, fileName, status: 'active' });
            this._processQueue()
            return;
        };
    
        const queuedItem = this.queue.removeById(messageID)
        if(queuedItem){
            eventBus.emit(DOWNLOAD_EVENTS.DOWNLOAD_CANCEL, { messageID, fileName, status: 'queued' });
        }
        
    }


    _processQueue(){
        while(this.activeDownloads < this.downloadLimit && this.queue.head){
            const fileInfo = this.queue.removeHead();
            this._startDownload(fileInfo)
        }
    }

    _startDownload({messageID,roomID,fileName,mimeType}){
        try{
            
            const controller = new AbortController()
            const signal = controller.signal;
            const fileID = this._getName(messageID,fileName)
            fileHandler.retrieveFileFromServer(roomID,
                messageID,
                fileName,
                mimeType,
                this._downloadProgressCallback(messageID,fileName),
                signal
              
            ).then(e => {
                if(e){
                  console.log("This is the downloaded file",e)
                  this._onDownloadFinished(messageID,fileName,e,mimeType)
                }
                 
            })

            this.downloadingItems.set(fileID,controller)
            this.activeDownloads++;
        }catch(error){
            console.error(error)
        }
        
    }

    _startFromPaused({}){

    }


    _downloadProgressCallback(messageID,fileName){
        return ({downloaded,fileSize}) => {

            const fileID = this._getName(messageID,fileName)
            eventBus.emit(DOWNLOAD_EVENTS.UPDATE_FILE_DOWNLOADED_TOTAL_CHUNK,{fileID,downloaded,fileSize,messageID,fileName})

        }
    }

    _onDownloadFinished(messageID,fileName,file,mimeType){
            const fileID = this._getName(messageID,fileName)
            this.downloadingItems.delete(fileID);
            this.activeDownloads--;
            eventBus.emit(DOWNLOAD_EVENTS.DOWNLOAD_FINISH,{fileID,messageID,fileName,file,mimeType})
            this._processQueue()
    }


    _getName(messageID,fileName){
        return `${messageID}-${fileName}`
    }



}


export const downloadManager = new DownloadManager()