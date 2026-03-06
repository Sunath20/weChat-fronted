import { APP_INTERACTIONS, CALL_INTERACTIONS, CALL_TYPES, CLICK_EVENTS, CONTACTS_INTERACTIONS, DOWNLOAD_INTERACTIONS, FILE_INTERACTIONS, UPLOAD_INTERACTIONS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import {query, readData} from "../utils.js"
import { callHandler, CallHandler } from "./callHandler.js";
import { FileHandler } from "./fileHandler.js";
import { visualHandler, VisualHandler } from "./visualHandler.js";




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


const NEW_CONTACT_ADD_BTN_CLS_NAME = ".save-new-profile-button"


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

const MENU_PICTURE_UPLOAD_ACTIONS_CLS_NAME = ".mobile-picture-file-dialog-anchor"
const MENU_PDF_UPLOAD_ACTIONS_CLS_NAME = ".mobile-pdf-file-dialog-anchor"
const MENU_VIDEO_UPLOAD_ACTIONS_CLS_NAME = ".mobile-video-file-dialog-anchor"

export const FILE_INPUT_MODAL_TAG = "file-input-modal"


// Call handling
const CALL_VIDEO_CALL_START_BUTTON_CLS_NAME = ".selected-user-call"
const CALL_AUDIO_ONLY_START_BUTTON_CLS_NAME = ".selected-user-call-audio"
const CALL_CANCEL_WHILE_RING_BUTTON_CLS_NAME = ".call-cancel-before-answer"
const CALL_ACCEPT_BY_RECEIVER_BUTTON_CLS_NAME = ".call-receiver-accept-button"
const CALL_CLOSE_BUTTON_BY_USER_CLS_NAME = ".end-call-button"
const CALL_AUDIO_ONLY_FINISH_CLS_NAME = ".call-disconnected-close"
const CALL_ONLY_AUDIO_DISCONNECTED_BUTTON_CLS_NAME = ".end-only-audio-call-button"


// Left Side of the app
const SETTING_OPEN_BUTTON_CLS_NAME = ".open-setting-button"
const SETTING_CLOSE_BUTTON_CLS_NAME = ".close-settings-tab"



// Download Manager Styling
const DOWNLOAD_MANAGER_MAXIMIZE_BTN = ".dm-btn.maximize"
const DOWNLOAD_MANAGER_MINIMIZE_BTN  = ".dm-btn.minimize"


// NEW PROFILE PICTURE UPLOADING
const NEW_PROFILE_PICTURE_SAVE_BTN_CLS_NAME = ".save-new-profile-picture-btn"

export class UIClickHandler extends ClickHandler {

    constructor(){
        super()

        // File upload events
        this.onFileMenuClick = this.onFileMenuClick.bind(this)
        this.onVideoUploadDialogClick = this.onVideoUploadDialogClick.bind(this)
        this.onClosingFileUploadClick = this.onClosingFileUploadClick.bind(this)
        this.onUploadAllFileClicked = this.onUploadAllFileClicked.bind(this)
        this.onPictureUploadDialogClicked = this.onPictureUploadDialogClicked.bind(this)
        this.onVideoUploadDialogClick = this.onVideoUploadDialogClick.bind(this)
        this.onPDFFileUploadDialogClick = this.onPDFFileUploadDialogClick.bind(this)

        // Calling UI Events

        this.onVideoCallButtonClick = this.onVideoCallButtonClick.bind(this)
        this.onAudioCallClicked = this.onAudioCallClicked.bind(this)
        this.onCancelCallBeforeAnswer = this.onCancelCallBeforeAnswer.bind(this)
        this.onCallAcceptByReceiver = this.onCallAcceptByReceiver.bind(this)
        this.callCloseButtonClick = this.callCloseButtonClick.bind(this)
        this.callCloseDialogAtEndOfTheCall = this.callCloseDialogAtEndOfTheCall.bind(this)
        this.callCancelAudioOnlyClicked  = this.callCancelAudioOnlyClicked.bind(this)

        // Settings
        this.closeSettingsTab = this.closeSettingsTab.bind(this)
        this.openSettingsTab = this.openSettingsTab.bind(this)
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

    /**
     * set the call handler
     * @param {CallHandler} handler 
     */
    setCallHandler(handler){
        this.callHandler = handler;
    }


    initClickHandlers(){

        this.setOnClick(query(NEW_CONTACT_ADD_BTN_CLS_NAME),this.saveNewProfile)

        this.setOnClick(query(FILE_MENU_DIALOG_CLS_NAME),this.onFileMenuClick)
        this.setOnClick(query(VIDEO_FILE_UPLOAD_ACTION_CLS_NAME),this.onVideoUploadDialogClick)
        this.setOnClick(query(MODAL_CLOSE_ACTION_CLS_NAME), this.onClosingFileUploadClick)

        // File Upload Actions
        this.setOnClick(query(ALL_FILES_UPLOAD_CLS_NAME),this.onUploadAllFileClicked)
        
        this.setOnClick(query(VIDEO_UPLOAD_ACTIONS_CLS_NAME),this.onVideoUploadDialogClick)
        this.setOnClick(query(PICTURE_UPLOAD_ACTIONS_CLS_NAME),this.onPictureUploadDialogClicked)
        this.setOnClick(query(PDF_UPLOAD_ACTIONS_CLS_NAME),this.onPDFFileUploadDialogClick)
        this.setOnClick(query(MENU_VIDEO_UPLOAD_ACTIONS_CLS_NAME),this.onVideoUploadDialogClick)
        this.setOnClick(query(MENU_PICTURE_UPLOAD_ACTIONS_CLS_NAME),this.onPictureUploadDialogClicked)
        this.setOnClick(query(MENU_PDF_UPLOAD_ACTIONS_CLS_NAME),this.onPDFFileUploadDialogClick)
        
        
        // this.setOnClick(query(AUDIO_UPLOAD_ACTIONS_CLS_NAME),t)
        this.setOnClick(query(CALL_VIDEO_CALL_START_BUTTON_CLS_NAME),this.onVideoCallButtonClick)
        this.setOnClick(query(CALL_AUDIO_ONLY_START_BUTTON_CLS_NAME),this.onAudioCallClicked)
        this.setOnClick(query(CALL_CANCEL_WHILE_RING_BUTTON_CLS_NAME),this.onCancelCallBeforeAnswer)
        this.setOnClick(query(CALL_ACCEPT_BY_RECEIVER_BUTTON_CLS_NAME),this.onCallAcceptByReceiver)
        this.setOnClick(query(CALL_CLOSE_BUTTON_BY_USER_CLS_NAME),this.callCloseButtonClick)
        this.setOnClick(query(CALL_AUDIO_ONLY_FINISH_CLS_NAME),this.callCloseDialogAtEndOfTheCall)
        this.setOnClick(query(CALL_ONLY_AUDIO_DISCONNECTED_BUTTON_CLS_NAME),this.callCancelAudioOnlyClicked)


        // Download Manager
        // this.setOnClick(query(DOWNLOAD_MANAGER_CLOSE_BTN_CLS_NAME),this.closeDownloaderManagerPopUp)
        // this.setOnClick(query(DOWNLOAD_MANAGER_MINIMIZE_BTN_CLS_NAME),this.toggleDownloaderDialogPopUp)
        this.setOnClick(query(DOWNLOAD_MANAGER_MAXIMIZE_BTN),this.maximizeDownloadManager)
        this.setOnClick(query(DOWNLOAD_MANAGER_MINIMIZE_BTN),this.minimizeDownloadManager)

        // Settings
        this.setOnClick(query(SETTING_CLOSE_BUTTON_CLS_NAME),this.closeSettingsTab)
        this.setOnClick(query(SETTING_OPEN_BUTTON_CLS_NAME),this.openSettingsTab)


        // Profile Picture Settings
        this.setOnClick(query(NEW_PROFILE_PICTURE_SAVE_BTN_CLS_NAME),this.updateProfilePic)
    }
    
    onFileMenuClick(){

    }

    onPictureUploadDialogClicked(event){
        // const inputElement = document.getElementById("FILES-SHARE_INPUT")
        // inputElement.accept = "image/*"
        eventBus.emit(UPLOAD_INTERACTIONS.SHOW_UPLOAD_MODAL,FILE_INPUT_MODAL_TAG)
    // this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    }

    onVideoUploadDialogClick(event){
        eventBus.emit(FILE_INTERACTIONS.FILE_UPLOAD_DIALOG_OPEN,true)
        // const inputElement = document.getElementById("FILES-SHARE_INPUT")
        // inputElement.accept = "video/*"
        // this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
    }

    onPDFFileUploadDialogClick(event){
        //  const inputElement = document.getElementById("FILES-SHARE_INPUT")
        // inputElement.accept = ".pdf"
        // this.visualHandler.modalHandler.showModal(FILE_INPUT_MODAL_TAG)
         eventBus.emit(UPLOAD_INTERACTIONS.SHOW_UPLOAD_MODAL,FILE_INPUT_MODAL_TAG)
    }

    onClosingFileUploadClick(event){
        event.preventDefault();
        eventBus.emit(UPLOAD_INTERACTIONS.CLOSE_UPLOAD_MODAL,FILE_INPUT_MODAL_TAG)
        // this.visualHandler.modalHandler.hideModal(FILE_INPUT_MODAL_TAG)
        // this.visualHandler.clearFileUploadPreview()
        // this.fileHandler.setYetToUploadFiles(null);
    }


async onUploadAllFileClicked(event){
        eventBus.emit(FILE_INTERACTIONS.FILES_UPLOAD,true);
        // const files = this.fileHandler.yetToUploadFiles
        // for(let i = 0 ; i < files.length;i++){
        //     const file = files[i]
        //     const progressElement = query(`.file-share-progress[upload-index="${i}"]`)
            
        //     await this.fileHandler.fileSendStart(file,(chuck,chucks) => {
        //         progressElement.max = chucks;
        //         progressElement.value = chuck;
        //     })

        //     this.visualHandler.clearUploadFilePreviewContainer(i)
        // }
        // setTimeout(() => {
        //     this.visualHandler.modalHandler.hideModal(FILE_INPUT_MODAL_TAG)
        // },2000)
    }

    /**
     * Starts the video call
     * @param {*} event 
     */
    async onVideoCallButtonClick(event){

            eventBus.emit(CALL_INTERACTIONS.VIDEO_CALL_START)
            // data['state'] = "Calling..."
            // const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
            // await callHandler.initCall(stream)
            // visualHandler.initCallerDialogWithUserInfo(data)

    }

    /**
     * Starts the audio call
     */
    async onAudioCallClicked(event){
        eventBus.emit(CALL_INTERACTIONS.START_AUDIO_CALL,true)
    }

    /**
     * Cancels the call before answering
     * @param {*} event 
     */
    async onCancelCallBeforeAnswer(event){
        this.visualHandler.closeCallDialog()
    }

    /**
     * Accept the call by the receiver
     * @param {*} event 
     */
    async onCallAcceptByReceiver(event){
          eventBus.emit(CLICK_EVENTS.CALL_ACCEPT)
    }

    /**
     * Close button clicked while in the call
     * @param {*} event 
     */
    async callCloseButtonClick(event){
        eventBus.emit(CALL_INTERACTIONS.CANCEL_CALL)
    }

    /**
     * close the audio call
     * @param {*} event 
     */
    async callCloseDialogAtEndOfTheCall(event){
        eventBus.emit(CALL_INTERACTIONS.CLOSE_CALL_FINISHED_DIALOG,true)
    }

    /**
     * Close the audio only call
     * @param {*} event 
     */
    async callCancelAudioOnlyClicked(event){
        eventBus.emit(CALL_INTERACTIONS.CANCEL_AUDIO_ONLY_CALL)
    }
    




    // Left side of the app

    // left side of the app Settings
    closeSettingsTab(){
        eventBus.emit(APP_INTERACTIONS.SETTINGS_CLOSE)
        // this.visualHandler.setLeftSideAppTab('1')
    }

    openSettingsTab(){
        eventBus.emit(APP_INTERACTIONS.SETTINGS_OPEN)
        // this.visualHandler.setLeftSideAppTab('2')
    }

    saveNewProfile(event){
        eventBus.emit(CONTACTS_INTERACTIONS.NEW_CONTACT_ADD,true)
    }



    closeDownloaderManagerPopUp(event){
        eventBus.emit(DOWNLOAD_INTERACTIONS.CLOSE_POPUP)
    }

    toggleDownloaderDialogPopUp(event){
        eventBus.emit(DOWNLOAD_INTERACTIONS.TOGGLE_MINIMIZE_POP_UP)
    }

    maximizeDownloadManager(event){
        eventBus.emit(DOWNLOAD_INTERACTIONS.SHOW_FULL_MANAGER)
    }

    minimizeDownloadManager(event){
        eventBus.emit(DOWNLOAD_INTERACTIONS.MINIMIZE_DOWNLOAD_MANAGER)
    }


    updateProfilePic(event){
        console.log("Start uploading the file")
        event.preventDefault();
        eventBus.emit(UPLOAD_INTERACTIONS.START_UPLOAD_PROFILE_PICTURE)
    }

}


export const clickHandler = new UIClickHandler()