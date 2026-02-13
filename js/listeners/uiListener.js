import { FRIEND_INTERACTIONS } from "../core/Actions.js";
import { eventBus } from "../core/EventBus.js";
import { query } from "../utils.js"

const SEARCH_CONTACT_NAME_INPUT_CLS_NAME = ".search-friend-name-input"


export function initUIListener(){

    query(SEARCH_CONTACT_NAME_INPUT_CLS_NAME).addEventListener('keyup',event => {
        const val = event.target.value;
        if(!val){
            eventBus.emit(FRIEND_INTERACTIONS.NORMAL_FRIENDS_VIEW)
            return;
        }else{
            eventBus.emit(FRIEND_INTERACTIONS.SEARCH_FRIENDS_VIEW,val);
        }


    })

}