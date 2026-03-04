import { DatabaseMessageModel } from "../models.js";
import { getSelectedUsersID, indexDBRequestToFunction, readData, sleep } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { apiHandler, APIHandler, WebSocketHandler } from "./requestHandling.js";
import { VisualHandler } from "./visualHandler.js";
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES, DOWNLOAD_EVENTS } from "../core/Actions.js"
import { eventBus } from "../core/EventBus.js";
import { getDownloadingInfo } from "../core/store.js";



export class FileHandler {


    constructor(){
        this.maximumFileSizeWithoutRequest = 1024 * 1024
    }

    /**
     * Set the web socket handler
     * @param {WebSocketHandler} handler 
     */
    setWebSocketHandler(handler){
        this.webSocketHandler = handler;
    }

    /**
     * Set the data handler
     * @param {DataHandler} handler 
     */
    setDataHandler(handler){
        this.dataHandler = handler;
    }

    /**
     * Set the visual handler
     * @param {VisualHandler} handler 
     */
    setVisualHandler(handler){
        this.visualHandler = handler;
    }

    
   /**
    * Set the API Handler
    * @param {APIHandler} apiHandler 
    */ 
   setAPIHandler(apiHandler){
        this.apiHandler = apiHandler
        this.serverBase = this.apiHandler.getServerBase()
   }


   setYetToUploadFiles(files){
        this.yetToUploadFiles = files;
   }

    /**
     * 
     * @param {File} file 
     */
    async fileSendStart(file,callback){
        const fileName = file.name;
        const {personOne,personTwo} = getSelectedUsersID(true)
        const {from,to} = getSelectedUsersID()

        const localPath = "/files/startFileUpload"
        const url = new URL(this.serverBase+localPath)
        const query = url.searchParams
        query.set('personOne',personOne);
        query.set('personTwo',personTwo);
        query.set('fileName',fileName);
        query.set('sentByID',from)
        query.set('mimeType',file.type)

        

        const response = await (fetch(url.toString(),{method:"GET"}).then(e => e.json()))
        const updatingFilePath = response['filePath']
        const savingName = response['fileName']
        const plainMessage  = new DatabaseMessageModel(response['message'])
        this.saveFile(savingName,file);


        plainMessage.friend = to
        plainMessage.fromUser = true;

        eventBus.emit(MESSAGE_TYPES.GET_BACK_CREATED_MESSAGE,plainMessage)
        // this.dataHandler.addMessage(plainMessage)
        // this.visualHandler.addOneToday(plainMessage)
        
        const newURl = this.serverBase + `/files/updateFile/${updatingFilePath}`
        let offset = 0;
        let chunkIndex = 0;
        const chunkSize = 1024*1024

        const totalChunks = Math.ceil(file.size / chunkSize);
        
        while(offset < file.size){
            const slice = file.slice(offset,offset+chunkSize);
            const buffer = await slice.arrayBuffer()
           
            const response = await  fetch(newURl,{
                method:"POST",
                headers:{
                    "Content-Type": "application/octet-stream",
                    "X-Chunk-Index": chunkIndex,
                    "X-File-Name": file.name,
                    "X-File-Size": file.size
                },
                body:buffer,
            })

            if(!response.ok){
                break;
            }
            
            if(callback){
                callback(chunkIndex + 1, totalChunks)
            }
            offset = offset + chunkSize
            chunkIndex += 1;


        }

        const payload = {
            from,
            to,
            message:response['message'],
            mainHandler:MAIN_HANDLERS.MESSAGE,
            handlerOne:MESSAGE_TYPES.FILE_MESSAGE_SEND_TO_OTHER_USER
        }

        this.webSocketHandler.sendData(JSON.stringify(payload))
    }

    async sendFileData(updateFilePath,chuck,chuckIndex){

    }


    saveFile(filePath,fileBlob){
        throw new Error("This function has to be override")
    }

    async readFile(filePath){
        throw new Error("This function has to be override")
    }

    deleteFile(filePath){
        throw new Error("This function has to override")
    }


        /**
         * Retrieve a media file from the server
         * Data is comes from a stream
         * Safe to assume server or the user not gonna get overloaded
         * @param {string} roomID - room id 
         * @param {string} messageID - message id
         * @param {string} fileName - name of the file
         * @param {string} mimeType - type of the blob file
         * @returns 
         */
      async retrieveFileFromServer(roomID,messageID,fileName,mimeType,downloadingCallback=(chunks)=>{},signal=null){

        
        const url = apiHandler.getServerBase() +  `/files/readFile/${roomID}/${messageID}-${fileName}`
        const response = await fetch(url,{signal})
        if(!response.ok)return;

        const fileSize = response.headers.get('Content-Length')
        eventBus.emit(DOWNLOAD_EVENTS.INIT_FILE_SIZE,{messageID,fileSize})

        const reader = response.body.getReader()

        let receiveLength = 0
        let chunks = []
        let anyError = false;

        try {
                while (true){
                const {done,value} = await reader.read()
                
                if(done){
                    break;
                }
                receiveLength += value.length;
                chunks.push(value);
                downloadingCallback({downloaded:receiveLength,fileSize,downloadedChunks:chunks.length,chunk:value})
                await sleep(1)
            }
        }catch(error){
            
            if(error.name === "AbortError"){

            return null;
            }

            throw error;
        }
        

        const fullData = new Uint8Array(receiveLength);
        let position = 0

        for(let chunk of chunks){
            fullData.set(chunk,position)
            position += chunk.length;
        }


        const file = new Blob([fullData],{type:mimeType})
        return file;
    }

    async retrieveFilePausedFromServer(roomID,messageID,fileName,downloadedSize,mimeType,downloadingCallback=(chunks)=>{},signal=null){
        const url = apiHandler.getServerBase() +  `/files/readFileWithOffset/${roomID}/${messageID}-${fileName}`
        const link = new URL(url);
        link.searchParams.set('downloaded',downloadedSize);
        const response = await fetch(link.toString(),{signal})
        if(!response.ok)return;

        const fileSize = response.headers.get('Content-Length')
        eventBus.emit(DOWNLOAD_EVENTS.INIT_FILE_SIZE,{messageID,fileSize})

        const reader = response.body.getReader()

        let receiveLength = 0
        let anyError = false;
        let chunks = 0;

        try {
                while (true){
                const {done,value} = await reader.read()
                
                if(done){
                    break;
                }
                receiveLength += value.length;
                chunks += 1;
                downloadingCallback({downloaded:receiveLength,fileSize,downloadedChunks:chunks,chunk:value})
                await sleep(1)
            }
        }catch(error){
            
            if(error.name === "AbortError"){
                return null;
            }
            throw error;
        }


    }

}


const FILE_DATABASE_NAME = "FILES_MEDIA"
const FILE_DATABASE_VERSION = 5
const toPromise = indexDBRequestToFunction
const FILE_INDEX_TAG = "files"
const DOWNLOADING_FILES_INDEXES = "downloading_files"

export class WebFileHandler extends FileHandler {
    
    constructor(){
        super()

        this.dbOkay = false;
        this.fileStore = null;
        this.fileReadRequest  = []
        this.tempFileRequests = []
        this.maximumFileSizeWithoutRequest = 1024 * 1024
        this.readFile = this.readFile.bind(this)

    }

    /**
     * Make the connection to the database
     * Structure will change base on the database version if want
     * If the read or save requests happens to be , they are executed at last
     */
    async init(){
        const dbRequest  = indexedDB.open(FILE_DATABASE_NAME,FILE_DATABASE_VERSION)
        dbRequest.onupgradeneeded  = (event) => {
            this.db = event.target.result
            this.onVersionChange()
        }
        const dbResult = await toPromise(dbRequest,{'onupgradeneeded':this.onVersionChange})
        this.db = dbResult.target.result;
        this.dbOkay = true;
        this.getFileStore()

        // Execute the file read requests
        for(let i = 0 ; i < this.fileReadRequest.length;i++){
            const fileRequest = this.fileReadRequest[i]
            const file = await this.readFile(fileRequest['filePath'])
            fileRequest['callback'](file)
        }

         for(let i = 0 ; i < this.tempFileRequests.length;i++){
            const fileRequest = this.tempFileRequests[i]
            const file = await this.readFile(fileRequest['filePath'])
            fileRequest['callback'](file)
        }
        
    }

    /**
     * On the database creation or version change
     */
    async onVersionChange(){
        await this.defineStructure()
    }

    /**
     * Define the structure of the database
     * Mostly used for creating object stores
     */
    async defineStructure(){
        if(!this.db.objectStoreNames.contains(FILE_INDEX_TAG)){
            const fileStoreRequest = this.db.createObjectStore(FILE_INDEX_TAG,{keyPath:"fileName"})
            await toPromise(fileStoreRequest.transaction,true) 
        }

        if(!this.db.objectStoreNames.contains(DOWNLOADING_FILES_INDEXES)){
            const downloadFileStoreRequest = this.db.createObjectStore(DOWNLOADING_FILES_INDEXES,{keyPath:"messageID"})
            await toPromise(downloadFileStoreRequest.transaction,true)
        }
        

    }


    // Save file in the file store
    saveFile(fileName,fileBlob){
        this.getFileStore()
        this.fileStore.add({fileName,fileBlob})
    }

    // Get the file store instance
    getFileStore(){
            this.fileStore = this.db.transaction([FILE_INDEX_TAG],'readwrite').objectStore(FILE_INDEX_TAG)
    }

    getTempFilestore(){
        this.tempStore = this.db.transaction([DOWNLOADING_FILES_INDEXES],'readwrite').objectStore(DOWNLOADING_FILES_INDEXES)
    }

    saveTempFile(payload){
        this.getTempFilestore()
        this.tempStore.add(payload)
    }


    /**
     * Read a file from the file store
     * Path of the file must be given - {messageID}-{fileName}
     * @param {string} filePath 
     * @returns 
     */
    async readFile(filePath){
        return new Promise( async (resolve,reject)  => {
        if(this.dbOkay){
                    this.getFileStore()
                    try{
                        const file = await toPromise(this.fileStore.get(filePath))
                        resolve(file.target.result)
                    }catch(error){
                        resolve("No files")
                    }
                    
                }else{
                  this.fileReadRequest.push({filePath,callback:(event) => {
                        resolve(event)
                    }})
        }
        
    })
      
    }



       /**
     * Read a file from the file store
     * Path of the file must be given - {messageID}-{fileName}
     * @param {string} filePath 
     * @returns 
     */
    async readTempFile(filePath){
        return new Promise( async (resolve,reject)  => {
        if(this.dbOkay){
                    this.getTempFilestore()
                    try{
                        const file = await toPromise(this.tempStore.get(filePath))
                        resolve(file.target.result)
                    }catch(error){
                        resolve("No files")
                    }
                    
                }else{
                  this.tempFileRequests.push({filePath,callback:(event) => {
                        resolve(event)
                    }})
        }
        
    })
      
    }


    async retrieveFileFromServer(roomID,messageID,fileName,mimeType,downloadingCallback=(chunks)=>{},signal=null){

        const callback = this.downloadingCallback(messageID,downloadingCallback).bind(this)
        const response = await super.retrieveFileFromServer(roomID,messageID,fileName,mimeType,callback,signal)
        return response;
    }

    async retrieveFilePausedFromServer(roomID,messageID,fileName,downloadedSize,mimeType,downloadingCallback=(chunks)=>{},signal=null){
        const callback = this.downloadingCallback(messageID,downloadingCallback).bind(this);
        console.log(fileName,"Why is this undefined ")
        const response = await super.retrieveFilePausedFromServer(roomID,messageID,fileName,downloadedSize,mimeType,callback,signal=null)

        try{
            const file = await this.readTempFile(messageID)
            // console.log(file,"This is the thing gonna convert")
            const blob = new Blob(file.chunks,{type:mimeType});
            eventBus.emit(DOWNLOAD_EVENTS.DOWNLOAD_FINISH,{mimeType,messageID,fileName,file:blob})
        }catch(error){
            console.error(error)
        }
        
    }


    downloadingCallback(messageID,callback){
        return async ({downloaded,chunk,fileSize,downloadedChunks}) => {
            this.getTempFilestore();
            const result = await this.readTempFile(messageID);
            
            if(result){
                const updatedObject = Object.assign(result,{downloaded,fileSize,downloadedChunks})
                updatedObject['chunks'].push(chunk)
                await this.tempStore.put(updatedObject);
            }else{
                await this.saveTempFile({
                    messageID,
                    downloaded,
                    fileSize,
                    downloadedChunks,
                    chunks:[chunk]
                })
            }

            callback({downloaded,chunk,fileSize,downloadedChunks})

        }
        
    }



    getFileInfoIfExist(roomID,messageID,fileName,mimeType){ 
       return getDownloadingInfo(messageID)
    }
  
    removeTempFile(messageID){
        this.getTempFilestore();
        this.tempStore.delete(messageID);
    }

}


export const fileHandler = new WebFileHandler()