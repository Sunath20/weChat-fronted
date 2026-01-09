import {query} from "../utils.js"




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

export class UIClickHandler extends ClickHandler {

    constructor(){
        super()
        this.onFileMenuClick = this.onFileMenuClick.bind(this)
    }


    initClickHandlers(){
        this.setOnClick(query(FILE_MENU_DIALOG_CLS_NAME),this.onFileMenuClick)
    }
    
    onFileMenuClick(){

    }

    

}