import {APIHandler} from "./handlers/requestHandling.js"



const SIGN_CONTAINER_CLS_NAME = ".sign-up"
const OTP_VALIDATION_CONTAINER_CLS_NAME = ".otp-validation"

const SWITCH_ACTION_TO_SIGN_IN_CLS_NAME = ".switch-to-sign-in-action"
const SWITCH_ACTION_TO_SIGN_UP_CLS_NAME = ".switch-to-sign-up-action"

const SIGN_UP_FIELDS_CLS_NAME = ".sign-up-fields"
const SIGN_UP_ACTIONS_CLS_NAME = ".sign-up-actions"

const SIGN_IN_FIELDS_CLS_NAME = ".sign-in-fields"
const SIGN_IN_ACTIONS_CLS_NAME = ".sign-in-actions"


// ACTION BUTTONS
const SIGN_UP_ACTION_BUTTON_CLS_NAME = ".sign-up-action"
const SIGN_IN_ACTION_BUTTON_CLS_NAME =  ".sign-in-action"



// CONTACT INFO LOGIN
const LOGIN_CONTACT_CLS_NAME = ".login-contact-number"

/**
 * Get the input values from the given inputs with save-as attribute
 * Only the given names will be picked out
 * Values will be return in a key value pair
 * @param  {...String} saveAsNames 
 * @returns {Object}
 */
function getInputValuesFromClsNames(...saveAsNames){
    const payload = {}
    const inputFields = document.querySelectorAll("input").forEach(e => {
        if( saveAsNames.indexOf(e.getAttribute('save-as')) > -1){
            payload[e.getAttribute('save-as')] = e.value;
        }
    })
    return payload;
}



// OTP VALIDATION
const OTP_INPUT_FIELD_CLS_NAME = ".otp-validator"

/**
 * Calls the server to send an otp for the user
 * Done in async mode
 * Returns what the server has to return
 * Json object with {okay:true or false}
 * @param {APIHandler} apiHandler 
 */
async function sendOTPValue(apiHandler,contactNumber){
    const response = await apiHandler.generateOTPForUser(contactNumber)
    const status = response.status
    const returnValue = await response.json()
    return returnValue;
}


/**
 * Combine all the input fields related to otp code 
 * Outputs the sum of six digits
 * @returns {string}
 */
function getOTPValues(){
    const values = []
    document.querySelectorAll(`[otp-number]`).forEach(e => {
        values.push(e.value)
    })
    return values.join("");
}


let currentUser = ""


async function onStart(){

    const apiHandler = new APIHandler()

    const signUpFields = document.querySelector(SIGN_UP_FIELDS_CLS_NAME)
    const signInFields = document.querySelector(SIGN_IN_FIELDS_CLS_NAME)
    const signUpActions = document.querySelector(SIGN_UP_ACTIONS_CLS_NAME)
    const signInActions = document.querySelector(SIGN_IN_ACTIONS_CLS_NAME)

    // Switch to sign in
    document.querySelector(SWITCH_ACTION_TO_SIGN_IN_CLS_NAME).addEventListener('click',(event) => {
            signUpFields.className = "fields sign-up-fields hide"
            signInFields.className = "fields sign-in-fields"

            signUpActions.className = "actions sign-up-actions hide"
            signInActions.className = "actions sign-in-actions"
            document.title = "Sign In"
           
    })
    // Switch to sign up
    document.querySelector(SWITCH_ACTION_TO_SIGN_UP_CLS_NAME).addEventListener('click',(event) => {
            signUpFields.className = "fields sign-up-fields"
            signInFields.className = "fields sign-in-fields hide"

            signUpActions.className = "actions sign-up-actions"
            signInActions.className = "actions sign-in-actions hide"
            document.title = "Sign Up"
    })
    // Sign Up User 
    document.querySelector(SIGN_UP_ACTION_BUTTON_CLS_NAME).addEventListener('click',async (event) => {
            try{
                const payload = getInputValuesFromClsNames('firstName','lastName','email','contactNumber','birthday')
                payload['countryCode'] = "+94"
                const responseRequest = await apiHandler.signUpRequest(payload);
                const statusCode = responseRequest.status;
                const response = await responseRequest.json()
                if(statusCode === 400){
                    console.log(response.data.error)
                }else if(statusCode === 201){
                    const createdUser = response[0]
                }
             
            }catch(error){
                console.error(error)
            }
        
        
    })
    // Sign in user
    document.querySelector(SIGN_IN_ACTIONS_CLS_NAME).addEventListener('click',async (event) => {
      const key = document.querySelector(".login-contact-number").value;
      currentUser = key;
      document.querySelector(SIGN_CONTAINER_CLS_NAME).className = "sign-up hide"
      document.querySelector(OTP_VALIDATION_CONTAINER_CLS_NAME).className = "otp-validation"
        const response = await sendOTPValue(apiHandler,key)
        console.log(response)
    }) 

    // OTP Field Change On Key
    document.querySelectorAll(OTP_INPUT_FIELD_CLS_NAME).forEach(e => {
        e.addEventListener('keyup',async (e) => {

              const otpNum = Number.parseInt(e.target.getAttribute('otp-number'))
            
            if(e.key === "Backspace"){
                if(otpNum !==1 && e.target.value === ""){

                        const element = document.querySelector(`[otp-number="${otpNum - 1}"]`)
                        element.value = "";
                        element.focus()
                    }
            }else{

                if(otpNum !== 6){
                    document.querySelector(`[otp-number="${otpNum+1}"]`).focus()
                }else{
                    const otpValue = getOTPValues();
                    const response = await apiHandler.checkOptValid(currentUser,otpValue);
                    const obj = await response.json()
                    if(obj['match']){
                        const e = document.getElementById('redirectPage')
                        e.href = "/"
                        e.click()
                        localStorage.setItem('userDetails',JSON.stringify({contact:document.querySelector(".login-contact-number").value}))
                    }
                }
            }

      
        })
    })


  

}

onStart()