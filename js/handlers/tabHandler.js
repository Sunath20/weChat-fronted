


export class TabHandler {

    constructor(){
        this.tabs = {}
        this.childrenDisplayData = {}
    }

    /**
     * 
     * @param {string} name 
     * @param {HTMLElement} element 
     */
    registerTab(name,element){
        if(!element)return;
        this.tabs[name] = element;
        const children = element.querySelectorAll(".tab-child")
        if(!children)return;
        for(const child of children.values()){
            
            const index = child.getAttribute("index")
            if(!this.childrenDisplayData[name]){
                this.childrenDisplayData[name] = {}
            }
            this.childrenDisplayData[name][index] = child.style.display;
        }
    }

    /**
     * Shows a specific tab with the tab attribute
     * @param {*} name 
     * @param {*} index 
     */
    showTab(name,index){
        const element = this.tabs[name]
        const children = element.querySelectorAll(".tab-child")

        for(const child of children.values()){
            
            const childIndex = child.getAttribute('index')

            if(childIndex === index){
                child.style.display = this.childrenDisplayData[name][childIndex];
            }else{
                child.style.display = "none";
            }

        }

    }

}