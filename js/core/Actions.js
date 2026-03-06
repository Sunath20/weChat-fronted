

export const MESSAGE_TYPES = {
    SEND: "SEND_MESSAGE",
    CREATE_ROOM: "CREATE_ROOM",
    ROOM_CREATED: "ROOM_CREATED",
    ROOM_CREATED_FAILED: "ROOM_CREATION_FAILED",
    MESSAGE_RECEIVED: "NEW_MESSAGE_RECEIVED",
    SET_MESSAGE_DELIVERED: "SET_MESSAGE_DELIVERED",
    MESSAGE_DELIVERED: "MESSAGE_DELIVERED",
    GET_BACK_CREATED_MESSAGE: "OWN_MESSAGE_SAVED",
    SET_LIST_OF_MESSAGE_DELIVERED: "SET_LIST_OF_MESSAGES_DELIVERED",
    RECEIVE_LIST_OF_MESSAGE_DELIVERED: "LIST_OF_MESSAGES_DELIVERED",
    SET_SEEN_MESSAGE: "SET_MESSAGE_SEEN",
    RECEIVE_SEEN_MESSAGE: "MESSAGE_SEEN",
    FILE_MESSAGE_SEND_TO_OTHER_USER: "FILE_MESSAGE_SENT",
    FILE_MESSAGE_RECEIVE_TO_OTHER_USER: "FILE_MESSAGE_RECEIVED",
    LOAD_NOT_DELIVERED_MESSAGES:"msg_load_not_delivered_messages",
    LOADED_NOT_DELIVERED_MESSAGES:"msg_loaded_not_delivered_messages",
    LOAD_PREVIOUS_MESSAGES:"msg_load_previous_messages",
    LOADED_PREVIOUS_MESSAGES:"msg_loaded_previous_messages"
}



export const MESSAGE_INTERACTIONS = {
    LOAD_PREVIOUS_MESSAGES:"msg_int_load_previous_messages"
}

export const USER_HANDLES = {
    NEW_CONNECTION: "USER_CONNECTED",
    REMOVE_CONNECTION: "USER_DISCONNECTED",
    IS_FRIEND_IS_ONLINE: "CHECK_FRIEND_ONLINE",
    RECEIVE_FRIEND_IS_ONLINE: "FRIEND_ONLINE_STATUS",
    SHARE_MY_ONLINE_STATE: "SHARE_MY_ONLINE_STATUS"
}



export const CALL_TYPES = {
    CALL_OFFER_CREATED: "CALL_OFFER_CREATED",
    CALL_OFFER_RECEIVED: "CALL_OFFER_RECEIVED",
    CALL_ANSWER_CREATED: "CALL_ANSWER_CREATED",
    CALL_ANSWER_RECEIVED: "CALL_ANSWER_RECEIVED",
    CALL_ICE_NEW_CANDIDATE_CREATED: "CALL_ICE_CANDIDATE_CREATED",
    CALL_ICE_NEW_CANDIDATE_RECEIVED: "CALL_ICE_CANDIDATE_RECEIVED",
    CALL_WAS_DISCONNECTED_BY_USER: "CALL_DISCONNECTED",
    CALL_WAS_DISCONNECTED_BY_USER_RECEIVED: "CALL_DISCONNECTED_RECEIVED",

}



export const CALL_INTERACTIONS = {
    START_AUDIO_CALL:"call_start_audio_call",
    CLOSE_CALL_FINISHED_DIALOG:"call_interaction_close_call_finished_dialog",
    CANCEL_AUDIO_ONLY_CALL:"call_int_cancel_audio_only_call",
    CANCEL_CALL:"call_int_cancel",
    VIDEO_CALL_START:"call:video-call-start"
}

export const CALL_EVENTS = {
    CALL_OFFER_CREATED:"call_events_offer_created"  
}

export const MAIN_HANDLERS = {
    USER_CONFIG: "USER_CONFIG",
    FILE_SHARE: "FILE_SHARE",
    MESSAGE: "MESSAGE",
    CALL: "CALL"
}

export const STORE_EVENTS = {
    MESSAGE_ADDED:"STORE_NEW_MESSAGE_ADDED",
    LOADED_MESSAGES_ADDED:"LOADED_MESSAGES_ADDED",
    CALLING_CONTACT_SET:"CALLING_CONTACT_SET",
    SELECTED_FRIEND_SET:"SELECTED_FRIEND_SET",
    ADD_NOT_DELIVERED_MESSAGES:"ADD_NOT_DELIVERED_MESSAGES",
    CALL_LOCAL_STREAM_SET:"store_call_local_stream_set",
    NOTIFICATION_COUNT_CHANGED:"store_notification_count_changed",
    NEW_CONTACT_ADDED:"store_new_contact_added",
    LOADED_PREVIOUS_MESSAGES:"store_loaded_previous_messages"
}

export const VISUAL_EVENTS = {
    MESSAGE_HAS_BEEN_READ_BY_USER:"VISUAL_MESSAGE_HAS_BEEN_READ_BY_USER",
    ADD_NEW_MESSAGE_BY_USER:"VISUAL_ADD_NEW_MESSAGE_BY_USER",
    ADD_CHAT_LOADING_BANNER:"ADD_CHAT_LOADING_BANNER",
    REMOVE_CHAT_LOADING_BANNER:"REMOVE_CHAT_LOADING_BANNER"
}

export const CLICK_EVENTS = {
    CALL_ACCEPT:"UI_CALL_ACCEPT_CLICKED"
}

export const DATA_EVENTS = {
    MESSAGES_ADD:"data_add_messages",
    NEW_SELECTED_USER_SAVED_MESSAGES:"new selected user current messages"
}





// FILES

export const FILE_TYPES = {
    FILE_CREATE: "FILE_CREATE",
    FILE_CHUNK_TO_SERVER: "FILE_CHUNK_TO_SERVER",
    FILE_CHUNK_TO_CLIENT: "FILE_CHUNK_TO_CLIENT",
    FILE_CHUNK_FINISHED: "FILE_CHUNK_FINISHED",
    FILE_CREATED: "FILE_CREATED"
}

export const FILE_EVENTS = {
    FILES_ADDED:"file_add_files",
    FILE_UPLOAD_SHOW:"file_show_upload",
    FILE_UPLOAD_HIDE:"file_hide_upload",
    FILE_UPLOAD_PREVIEW:"file_upload_preview",
    FILE_PROGRESS_MADE:"file_upload_progress",
    FILE_UPLOAD_FINISHED:"file_upload_finished",
    FILE_SAVE_LOCALLY:"file_save_locally",
    FILE_UPLOAD_END:"file_upload_end",
    FILE_UPLOAD_BEGIN:"file_upload_begin",
    FILE_CHUNK_COMPLETED:"file_one_chunk_completed",
    FILE_UPLOAD_ALL_FINISHED:"file_upload_all_finished",
    FILE_READ_LOCAL:"file_read_local_file",
    FILE_READ_COMPLETE_LOCAL:"file_read_complete_local",
    FILE_START_DOWNLOAD:"file_start_download",
    FILE_ACCEPT_DOWNLOAD_REQUEST:"file:event:accept:download-request",
    FILE_ACCEPTED_DOWNLOAD_REQUEST:"file:event:accepted:download-request",
    FILE_READ_TEMP:"file:event:read-temp-file",
    FILE_READ_TEMP_FINISHED:"file:event:read-temp-file-completed",
    FILE_COMMITTED_TEMP_FILE:"file:committed:temp:file-save"
}

export const FILE_INTERACTIONS = {
    FILE_UPLOAD_DIALOG_OPEN:"file_open_upload_dialog",
    FILE_UPLOAD_DIALOG_CLOSE:"file_close_upload_dialog",
    FILE_SET_UPLOAD_PREVIEWS:"file_on_upload_previews",
    FILES_UPLOAD:"file_on_upload"
}


// Friends
export const FRIEND_EVENTS = {
    FILTERED_CONTACTS:"friends_event_filtered_contacts"
}

export const FRIEND_INTERACTIONS = {
    FRIEND_SELECTED:"friend_selected_to_chat",
    NORMAL_FRIENDS_VIEW:"friend_set_normal_friends_view",
    SEARCH_FRIENDS_VIEW:"friend_set_search_friends_view"
}

export const CONTACTS_INTERACTIONS = {
    NEW_CONTACT_ADD:"contact_new_add"
}

export const CONTACTS_EVENTS = {
    
}


export const APP_EVENTS = {
  READY: "app_ready"
}

export const APP_INTERACTIONS = {
    SETTINGS_CLOSE:"app_close_settings",
    SETTINGS_OPEN:"app_open_settings",
     
}

export const REGISTER_EVENTS = {
    REGISTER_BUTTON_CLICK:"reg:btn:click:event"
}


export const DOWNLOAD_EVENTS = {
    START_DOWNLOAD:"download_start_new_download",
    RECEIVED_A_CHUNK:"download:event:received-a-chunk",
    UPDATE_FILE_DOWNLOADED_TOTAL_CHUNK:"download_update_downloaded_total_chunks",
    DOWNLOAD_FINISH:"download_file_finished",
    INIT_FILE_SIZE:"download:event:init:file-size",
    ADDED_TO_QUEUE:"download:event:added-to-queue",
    LOAD_PAUSED_DOWNLOADS:"download:event:load-downloading-items",
    REMOVE_DOWNLOAD:"download:event:remove-download"
}


export const DOWNLOAD_INTERACTIONS = {
    CLOSE_POPUP:"download:interactions:close-pop-up",
    TOGGLE_MINIMIZE_POP_UP:"download:interactions:toggle:minimize:pop-up",
    SHOW_FULL_MANAGER:"download:interactions:show:full-manager",
    MINIMIZE_DOWNLOAD_MANAGER:"download:interactions:minimized:manager",
    PAUSE_DOWNLOAD_ITEM:"download:interactions:paused:download-item",
    START_DOWNLOAD_FROM_PAUSED:"download:interactions:start:from-paused",
    RETRY_DOWNLOAD:"download:interactions:retry-download",
    REMOVE_DOWNLOAD:"download:interactions:remove-download"
}

export const UPLOAD_INTERACTIONS = {
    SHOW_UPLOAD_MODAL:"upload_interactions_show_upload_modal",
    CLOSE_UPLOAD_MODAL:"upload_interactions_close_upload_modal",
    START_UPLOAD_PROFILE_PICTURE:"upload:start-profile-picture"
}


export const REQUEST_APP_DATA = {
    'TEMP_FILE_INFO':"request:file:temp-file-info",
    'TEMP_FILE_INFO_RESPONSE':"request:file:temp-file-info-response"
}

// Errors
export const ERRORS = {
    MESSAGE_LOADING_FAILED:"error_message_load_failed",
    LOADING_PREVIOUS_MESSAGES_FAILED:"error_loading_previous_messages_failed",
    TEMP_FILE_INFO_READ_FAILED:"temp:file:info:read:failed",
    TEMP_FILE_SAVING_FAILED:"temp:file:save-failed",
    TEMP_FILE_COMMIT_FAILED:"temp:file-commit-fail"
}


export const ERROR_REASONS = {
    TEMP_FILES:{
        FILE_DOES_NOT_EXIST:"temp:file:does-not-exist"
    },
    SECURITY_KEY:{
        READ_ERROR:"security:key-read-error",
        FAILED_TO_WRITE:"security:key-written-failed"
    }
}

