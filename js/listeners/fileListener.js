import { FILE_EVENTS, FILE_INTERACTIONS } from "../core/Actions.js";
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

}