

/**
 * Handle events like enter and backspace if you want
 * You set the element, key down or key up or pressed can be selected
 * TODO - Have the ability to each key to be able to perform when they want (keyup,keydown,press)
 */
export class KeyBoardHandler {


    constructor(){

    }

    /**
     * Listen to the keyboard event for the following element
     * @param {HTMLElement} element 
     */
    setElement(element){
        this.element = element;

        this.element.addEventListener('keydown',(event) => {
            switch (event.code){
                case "Enter":
                    this.onEnterPressed(event);
                    break;
            }
        })
    }


    /**
     * Save the function we wanna call when the `enter` event trigger
     * Function still receive the event given by the browser
     * This is for pure management purpose only
     * @param {Function} enterFunc 
     */
    setOnEnter(enterFunc){
        this.onEnterPressed = enterFunc;
    }

}



