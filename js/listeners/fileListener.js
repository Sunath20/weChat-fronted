import { DOWNLOAD_EVENTS, DOWNLOAD_INTERACTIONS, ERRORS, FILE_EVENTS, FILE_INTERACTIONS, REQUEST_APP_DATA, UPLOAD_INTERACTIONS } from "../core/Actions.js";
import { DOWNLOADING_STATUS, downloadManager } from "../core/DownloadManager.js";
import { eventBus } from "../core/EventBus.js";
import { getDownloadingInfo, getUploadingFiles, setUploadFiles } from "../core/store.js";
import { fileHandler } from "../handlers/fileHandler.js";
import { apiHandler } from "../handlers/requestHandling.js";



export function initFileListener(){

    eventBus.on(FILE_INTERACTIONS.FILE_SET_UPLOAD_PREVIEWS,payload => {
        setUploadFiles(payload)
    })

    eventBus.on(FILE_INTERACTIONS.FILES_UPLOAD,async payload => {
        const files = getUploadingFiles()

        for(let i = 0; i < files.length;i++){
            await apiHandler.uploadMediaFile(files[i],i)
        }

        eventBus.emit(FILE_EVENTS.FILE_UPLOAD_ALL_FINISHED,true)
    })

    eventBus.on(FILE_EVENTS.FILE_SAVE_LOCALLY,payload => {
        fileHandler.saveFile(payload.savingName,payload.file);
    })

    eventBus.on(FILE_EVENTS.FILE_UPLOAD_ALL_FINISHED,(payload) => {
        setUploadFiles([])
    })

    eventBus.on(FILE_EVENTS.FILE_READ_LOCAL,({roomID,messageID,fileSize,fileName,mimeType}) => {
    
        // console.log("Looking for file called ",fileName)
        fileHandler.readFile(`${messageID}-${fileName}`).then(e => {
            // console.log(e,"Checking for null values")
            if(!e){
                console.log("Have to download the file ",messageID,fileName,mimeType)
                console.log("It's a larger file size")
                eventBus.emit(FILE_EVENTS.FILE_ACCEPT_DOWNLOAD_REQUEST,{roomID,messageID,fileName,mimeType}) 
                return;
            };
            eventBus.emit(FILE_EVENTS.FILE_READ_COMPLETE_LOCAL,{messageID,roomID,mimeType,file:e})
        })

    })

    eventBus.on(FILE_EVENTS.FILE_ACCEPTED_DOWNLOAD_REQUEST,({messageID,fileName,roomID,mimeType}) => {
        console.log("We are gonna download ",messageID,fileName)
        eventBus.emit(DOWNLOAD_EVENTS.START_DOWNLOAD,{messageID,fileName,roomID,mimeType})
    })

    eventBus.on(UPLOAD_INTERACTIONS.CLOSE_UPLOAD_MODAL,modalTag => {
        fileHandler.setYetToUploadFiles([])
    })

    // eventBus.on(DOWNLOAD_EVENTS.START_DOWNLOAD,({roomID,messageID,fileName,mimeType}) => {
    //     const fileCurrentInfo = fileHandler.getFileInfoIfExist(roomID,messageID,fileName,mimeType);
    //     console.log("Read the file info")
    //     // // console.log("Here is the existing file info ",fileCurrentInfo)
    //     if(fileCurrentInfo != null && fileCurrentInfo['status'] === DOWNLOADING_STATUS.DOWNLOADING && (fileCurrentInfo['fileSize'] == null || fileCurrentInfo['fileSize'] == undefined )){
    //                     downloadManager.addFile(roomID,messageID,fileName,mimeType);
    //     }else{
    //             console.log("We gonna start from paused state")
    //             downloadManager.startFromPaused({messageID,fileName});
    //     }
        
    // }


    // Save Downloading files as temp
    // eventBus.on(DOWNLOAD_EVENTS.RECEIVED_A_CHUNK,async ({downloaded,fileSize,downloadedChunks,chunk,messageID,fileName,roomID,mimeType}) => {
    //     try{
    //         const response = await fileHandler.saveTempFile({downloaded,chunk,fileSize,messageID,downloadedChunks,mimeType,roomID,fileName})
    //         if(!response){
    //             eventBus.emit(ERRORS.TEMP_FILE_SAVING_FAILED,{messageID,downloaded,chunk});
    //         }
    //     }catch(error){
    //         eventBus.emit(ERRORS.TEMP_FILE_SAVING_FAILED,{messageID,downloaded,chunk});
    //     }
        
    // })

    eventBus.on(DOWNLOAD_EVENTS.DOWNLOAD_FINISH,async ({messageID}) => {
        try{
            console.log("Commiting the new file ",messageID)
            const success = await fileHandler.commitTempFile(messageID);
            if(!success){
                eventBus.emit(ERRORS.TEMP_FILE_COMMIT_FAILED)
            }
        }catch(error){

        }
    })
}