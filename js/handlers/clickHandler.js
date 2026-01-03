


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