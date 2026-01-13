import {query} from "../utils.js"
import { FileHandler } from "./fileHandler.js";
import { VisualHandler } from "./visualHandler.js";




export class ClickHandler {


    constructor(){
        this.components = {}
    }

    setOnClick(element,func,name,realTime=false){
        this.components[name] = realTime ? element() : element;
        this.components[name].addEventListener('click',func);
    }

    removeOnClick(element,func,name,realTime=false){
         this.components[name] = realTime ? element() : element;
        this.component[name].addEventListener('click',func)
    }

}


const FILE_MENU_DIALOG_CLS_NAME = ".share-file-dialog"
const FILE_SHARE_MODEL_BODY_CLS_NAME = ".file-share-dialog"

const VIDEO_FILE_UPLOAD_ACTION_CLS_NAME = ".video-file-dialog-anchor"
const MODAL_CLOSE_ACTION_CLS_NAME = ".share-file-modal-close"

// Upload files class names
const ALL_FILES_UPLOAD_CLS_NAME = ".all-file-upload-button"

const VIDEO_UPLOAD_ACTIONS_CLS_NAME = ".video-file-dialog-anchor"
const AUDIO_UPLOAD_ACTIONS_CLS_NAME = ""
const PICTURE_UPLOAD_ACTIONS_CLS_NAME = ".picture-file-dialog-anchor"
const PDF_UPLOAD_ACTIONS_CLS_NAME = ".pdf-file-dialog-anchor"
const FILE_UPLOAD_ACTIONS_CLS_NAME = ""

const FILE_INPUT_MODAL_TAG = "file-input-modal"

export class UIClickHandler extends ClickHandler {

    constructor(){
        super()
        this.onFileMenuClick = this.onFileMenuClick.bind(this)
        this.onVideoUploadDialogClick = this.onVideoUploadDialogClick.bind(this)
        this.onClosingFileUploadClick = this.onClosingFileUploadClick.bind(this)
        this.onUploadAllFileClicked = this.onUploadAllFileClicked.bind(this)
        this.onPictureUploadDialogClicked = this.onPictureUploadDialogClicked.bind(this)
        this.onVideoUploadDialogClick = this.onVideoUploadDialogClick.bind(this)
        this.onPDFFileUploadDialogClick = this.onPDFFileUploadDialogClick.bind(this)
    }

    /**
     * set the visual handler
     * @param {VisualHandler} handler 
     */
    setVisualHandler(handler){
        this.visualHandler = handler;
    }

    /**
     * Set the file handler
     * @param {FileHandler} handler 
     */
    setFileHandler(handler){
        this.fileHandler = handler;
    }


    initClickHandlers(){
        this.setOnClick(query(FILE_MENU_DIALOG_CLS_NAME),this.onFileMenuClick)
        this.setOnClick(query(VIDEO_FILE_UPLOAD_ACTION_CLS_NAME),this.onVideoUploadDialogClick)
        this.setOnClick(query(MODAL_CLOSE_ACTION_CLS_NAME), this.onClosingFileUploadClick)

        // File Upload Actions
        // this.setOnClick(query(ALL_FILES_UPLOAD_CLS_NAME),this.onUploadAllFileClicked)
        
        this.setOnClick(query(VIDEO_UPLOAD_ACTIONS_CLS_NAME),this.onVideoUploadDialogClick)
        this.setOnClick(query(PICTURE_UPLOAD_ACTIONS_CLS_NAME),this.onPictureUploadDialogClicked)
        this.setOnClick(query(PDF_UPLOAD_ACTIONS_CLS_NAME),this.onPDFFileUploadDialogClick)
        
        // this.setOnClick(query(AUDIO_UPLOAD_ACTIONS_CLS_NAME),t)

    }
    
    onFileMenuClick(){

    }

    onPictureUploadDialogClicked(event){
        const inputElement = document.getElementById("FILES-SHARE_INPUT")
        inputElement.accept = "image/*"
        this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    }

    onVideoUploadDialogClick(event){
        const inputElement = document.getElementById("FILES-SHARE_INPUT")
        inputElement.accept = "video/*"
        this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    }

    onPDFFileUploadDialogClick(event){
         const inputElement = document.getElementById("FILES-SHARE_INPUT")
        inputElement.accept = ".pdf"
        this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    }

    onClosingFileUploadClick(event){
        event.preventDefault()
        this.visualHandler.modalHandler.hideModal(FILE_INPUT_MODAL_TAG)
        this.visualHandler.clearFileUploadPreview()
        this.fileHandler.setYetToUploadFiles(null);
    }


    async onUploadAllFileClicked(event){
        const files = this.fileHandler.yetToUploadFiles
        for(let i = 0 ; i < files.length;i++){
            const file = files[i]
            const progressElement = query(`.file-share-progress[upload-index="${i}"]`)
            
            await this.fileHandler.fileSendStart(file,(chuck,chucks) => {
                progressElement.max = chucks;
                progressElement.value = chuck;
            })

            this.visualHandler.clearUploadFilePreviewContainer(i)
        }

        setTimeout(() => {
            this.visualHandler.modalHandler.hideModal(FILE_INPUT_MODAL_TAG)
        },2000)
    }

  
    

}