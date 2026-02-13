import { DOWNLOAD_EVENTS, FILE_EVENTS, FILE_INTERACTIONS, UPLOAD_INTERACTIONS } from "../core/Actions.js";
import { downloadManager } from "../core/DownloadManager.js";
import { eventBus } from "../core/EventBus.js";
import { getUploadingFiles, setUploadFiles } from "../core/store.js";
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

    eventBus.on(FILE_EVENTS.FILE_READ_LOCAL,({roomID,messageID,fileName,mimeType}) => {
        // console.log("Looking for file called ",fileName)
        fileHandler.readFile(`${messageID}-${fileName}`).then(e => {
            // console.log(e,"Checking for null values")
            if(!e){
                console.log("Did not found the file start download it",fileName)
                eventBus.emit(DOWNLOAD_EVENTS.START_DOWNLOAD,{roomID,messageID,fileName,mimeType})
                return;
            };
            eventBus.emit(FILE_EVENTS.FILE_READ_COMPLETE_LOCAL,{messageID,roomID,mimeType,file:e})
        })

    })

    eventBus.on(UPLOAD_INTERACTIONS.CLOSE_UPLOAD_MODAL,modalTag => {
        fileHandler.setYetToUploadFiles([])
    })

    eventBus.on(DOWNLOAD_EVENTS.START_DOWNLOAD,({roomID,messageID,fileName,mimeType}) => {
        console.log("adding one to the manager ",fileName)
        downloadManager.addFile(roomID,messageID,fileName,mimeType);
    })

    eventBus.on(DOWNLOAD_EVENTS.DOWNLOAD_FINISH,({mimeType,messageID,fileName,file}) => {
        fileHandler.saveFile(`${messageID}-${fileName}`,file)
    })

}