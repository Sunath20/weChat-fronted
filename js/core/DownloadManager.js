import { fileHandler } from "../handlers/fileHandler.js";
import { apiHandler } from "../handlers/requestHandling.js";
import { sleep } from "../utils.js";
import { DOWNLOAD_EVENTS } from "./Actions.js";
import { eventBus } from "./EventBus.js";

export const SERVER_BASE = "https://192.168.8.202:3000"
class Queue {
    constructor() {
        this.items = [];
    }

    // Add element to the end of the queue
    enqueue(element) {
        this.items.push(element);
    }

    // Remove and return the first element from the queue
    dequeue() {
        if (this.isEmpty()) {
            return "Queue is empty";
        }
        return this.items.shift();
    }

    // View the first element in the queue
    peek() {
        return this.items[0];
    }

    // Check if the queue is empty
    isEmpty() {
        return this.items.length === 0;
    }

    // Get the size of the queue
    size() {
        return this.items.length;
    }

    find(func){
        return this.items.find(func);
    }

    remove(messageID){
        const index = this.items.findIndex(e => e === messageID);
        if(index !== -1) this.items.splice(index, 1);
    }
}


export const DOWNLOADING_STATUS = {
    WAITING:"WAITING",
    DOWNLOADING:"DOWNLOADING",
    PAUSED:"PAUSED",
}


class DownloadManager {
    
    constructor(downloadLimit=5){
        this.serverBase = SERVER_BASE + "/"+"files";
        this.downloads = new Queue();
        
        this.downloadInfo = new Map();

        this.downloadSignals = new Map();
        this.currentDownloads = new Set();
        this.pausedDownloads = new Map();
        this.downloadLimit = downloadLimit;
        this.retryInfo = new Map();
        this.maximumRetries = 5;
    }


async addFile(roomID, messageID, fileName, mimeType){
    console.log("Adding the file ",messageID)
    // already in queue or actively downloading, ignore
    const fileInfo = this.downloads.find(e => e === messageID);
    if(fileInfo || this.currentDownloads.has(messageID)) return;

    // if paused, resume it
    if(this.pausedDownloads.has(messageID)){
        this.startFromPaused(messageID);
        return;
    }

    // check if we have existing progress in IndexedDB
    const tempFile = await fileHandler.readTempFile(messageID);
    if(tempFile){
        // restore from temp file
        this.downloadInfo.set(messageID, {
            roomID, 
            messageID, 
            fileName, 
            mimeType, 
            status: DOWNLOADING_STATUS.WAITING,
            downloaded: tempFile.downloaded,
            downloadedChunks: tempFile.downloadedChunks
        });
    }else{
        // fresh download
        this.downloadInfo.set(messageID, {roomID, messageID, fileName, mimeType, status: DOWNLOADING_STATUS.WAITING});
    }

    this.downloads.enqueue(messageID);
    this._processQueue();
}



    async _downloadFile({roomID,messageID,fileName,mimeType,downloaded=null,downloadedChunks=0}){
                
                
                if(this.downloadSignals.has(messageID)){return;}

                let url = ""

                if(downloaded == null){
                     url = this.serverBase + "/" + "readFile" + "/" + roomID+"/"+ this._downloadFileName(messageID,fileName)
                }else{
                    url = this.serverBase + "/" + "readFileWithOffset" + "/" + roomID+"/"+ this._downloadFileName(messageID,fileName)
                    const builder = new URL(url)
                    builder.searchParams.set('downloadedSize',downloaded);
                    url = builder.toString()
                }

                const controller = new AbortController();
                this.downloadSignals.set(messageID,controller);
               const response = await fetch(url,{signal:controller.signal})
               if(!response.ok){
                    this._downloadFailed({roomID,messageID,fileName});
                     return;
               };

            const data = this.downloadInfo.get(messageID)
            this.downloadInfo.set(messageID,{...data,status:DOWNLOADING_STATUS.DOWNLOADING})
       
               const fileSize = response.headers.get('Content-Length')
               const totalFileSize = Number(fileSize) + Number(downloaded || 0);
               eventBus.emit(DOWNLOAD_EVENTS.INIT_FILE_SIZE,{messageID,fileSize:totalFileSize})
       
               const reader = response.body.getReader()
       
               let receiveLength = downloaded || 0
               let anyError = false;
               let chunks = downloadedChunks || 0;
       
               try {
                       while (true){
                       const {done,value} = await reader.read()
                       
                       if(done){
                        this._downloadFinish({roomID,fileName,messageID})
                        break;
                       }
                       receiveLength += value.length;
                       chunks += 1;
                       const info = this.downloadInfo.get(messageID);
                    //    this.downloadInfo.set(messageID,{...info,downloaded:receiveLength,chunks,waitingFoEvents:true});
                        await fileHandler.saveTempFile({downloaded:receiveLength,fileSize:totalFileSize,downloadedChunks:chunks,chunk:value,messageID,fileName,roomID,mimeType})
                       eventBus.emit(DOWNLOAD_EVENTS.RECEIVED_A_CHUNK,{downloaded:receiveLength,fileSize:totalFileSize,downloadedChunks:chunks,chunk:value,messageID,fileName,roomID,mimeType});
                    //    this.downloadInfo.set(messageID,{...info,downloaded:receiveLength,chunks,waitingFoEvents:false})
                    //   await sleep(0.5);
                }
               }catch(error){
                   
                   if(error.name === "AbortError"){
       
                   return null;
                   }
       
                   throw error;
               }

    }

    _downloadFailed({roomID, messageID, fileName, mimeType}){
        let retries = this.retryInfo.get(messageID) || 0;
        retries += 1;
        this.retryInfo.set(messageID, retries);

        if(retries < this.maximumRetries){
            // clean up current attempt
            this.currentDownloads.delete(messageID);
            this.downloadSignals.delete(messageID);
            
            // re-enqueue for retry
            this.downloads.enqueue(messageID);
            this._processQueue();
        }else{
            // max retries reached, remove from everything
            this._removeFromAllInstances(messageID);
            eventBus.emit(DOWNLOAD_EVENTS.FAILED_TO_DOWNLOAD, messageID);
        }
    }

    _removeFromAllInstances(messageID){
        this.currentDownloads.delete(messageID);
        this.downloadSignals.get(messageID)?.abort();
        this.downloadSignals.delete(messageID);
        this.retryInfo.delete(messageID);
        this.downloadInfo.delete(messageID);
        this.pausedDownloads.delete(messageID);
        this.downloads.remove(messageID);
    }

async startFromPaused(messageID){
    console.log("We are gonna restart from where we left",messageID)
    if(this.pausedDownloads.has(messageID)){
        const info = this.downloadInfo.get(messageID);
        this.pausedDownloads.delete(messageID);
        this.downloadInfo.set(messageID, {...info, status: DOWNLOADING_STATUS.WAITING});
        this.downloads.enqueue(messageID); // ✅ back in the queue
        this._processQueue(); // ✅ let processQueue handle it naturally
    }
}
    
    pauseDownload(messageID){
        console.log("We are going to pause the download event",messageID)
        if(this.currentDownloads.has(messageID)){
            this.currentDownloads.delete(messageID);
            this.downloadSignals.get(messageID).abort();
            this.downloadSignals.delete(messageID);
            this.retryInfo.delete(messageID);
            this.pausedDownloads.set(messageID,'PAUSED');
            const info = this.downloadInfo.get(messageID)
            this.downloadInfo.set(messageID,{...info,status:DOWNLOADING_STATUS.PAUSED})
            eventBus.emit(DOWNLOAD_EVENTS.PAUSED_DOWNLOADS,messageID);
        }
        this._processQueue()
    }

 async removeDownload(messageID){
    this.downloadSignals.get(messageID)?.abort();
    this._removeFromAllInstances(messageID);
    await fileHandler.removeTempFile(messageID); // ✅ wipe temp file too
    eventBus.emit(DOWNLOAD_EVENTS.REMOVE_DOWNLOAD, messageID);
    this._processQueue();
}

   _downloadFinish({roomID, messageID, fileName}){
    const finishDownloadFileInfo = this.downloadInfo.get(messageID);
    this._removeFromAllInstances(messageID); // ✅ cleans up
    eventBus.emit(DOWNLOAD_EVENTS.DOWNLOAD_FINISH, finishDownloadFileInfo);
    this._processQueue(); // ✅ should trigger next
}

    _downloadFileName(messageID,fileName){
        return `${messageID}-${fileName}`
    }

   _processQueue(){
    while(!this.downloads.isEmpty()){
        const messageID = this.downloads.dequeue();
        this.currentDownloads.add(messageID);
        const {roomID, fileName, mimeType, downloaded, downloadedChunks} = this.downloadInfo.get(messageID);
        this._downloadFile({
            roomID, 
            messageID, 
            fileName, 
            mimeType,
            downloaded: downloaded || null,
            downloadedChunks: downloadedChunks || 0
        });
    }
}


async retryDownload(messageID){
    const info = this.downloadInfo.get(messageID);
    if(!info) return;

    // clean up everything including temp file
    this._removeFromAllInstances(messageID);
    await fileHandler.removeTempFile(messageID);

    // re-add as fresh download
    this.downloadInfo.set(messageID, {
        roomID: info.roomID,
        messageID,
        fileName: info.fileName,
        mimeType: info.mimeType,
        status: DOWNLOADING_STATUS.WAITING
    });
    this.downloads.enqueue(messageID);
    this._processQueue();
}




}


export const downloadManager = new DownloadManager()