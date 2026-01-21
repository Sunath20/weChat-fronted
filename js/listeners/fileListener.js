import { FILE_INTERACTIONS } from "../core/Actions";
import { eventBus } from "../core/EventBus";
import { getUploadingFiles, setUploadFiles } from "../core/store";



export function initFileListener(){

    eventBus.on(FILE_INTERACTIONS.FILE_SET_UPLOAD_PREVIEWS,payload => {
        setUploadFiles(payload)
    })

    eventBus.on(FILE_INTERACTIONS.FILES_UPLOAD,payload => {
        const files = getUploadingFiles()
    })

}