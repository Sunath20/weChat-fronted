import { DOWNLOAD_EVENTS, DOWNLOAD_INTERACTIONS } from "../core/Actions.js";
import { downloadManager } from "../core/DownloadManager.js";
import { eventBus } from "../core/EventBus.js";



export function initDownloadListener(){


    eventBus.on(DOWNLOAD_EVENTS.START_DOWNLOAD,({roomID,messageID,fileName,mimeType}) => {
        downloadManager.addFile(roomID,messageID,fileName,mimeType);
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.PAUSE_DOWNLOAD_ITEM,({messageID,fileName}) => {
        downloadManager.pauseDownload(messageID);
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.START_DOWNLOAD_FROM_PAUSED,({messageID,fileName}) => {
        downloadManager.startFromPaused(messageID);
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.RETRY_DOWNLOAD,({messageID,fileName}) => {
        downloadManager.retryDownload(messageID)
    })

    eventBus.on(DOWNLOAD_INTERACTIONS.REMOVE_DOWNLOAD,({messageID,fileName}) => {
        downloadManager.removeDownload(messageID)
    })


}