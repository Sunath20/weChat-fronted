import { getSelectedUsersID, query } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import { CALL_TYPES, MAIN_HANDLERS, WebSocketHandler } from "./requestHandling.js";
import { VisualHandler } from "./visualHandler.js";


const CALL_CONFIGURATION = {iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.ekiga.net" },
    { urls: "stun:stun.ideasip.com" },
    { urls: "stun:stun.schlund.de" },
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.voiparound.com" },
    { urls: "stun:stun.voipbuster.com" },
    { urls: "stun:stun.voipstunt.com" },
    { urls: "stun:stun.voxgratia.org" }]
}

export class CallHandler {
    
    constructor(){
        this.handlers = {
            [CALL_TYPES.CALL_OFFER_RECEIVED]:this.onCallOfferReceived.bind(this),
            [CALL_TYPES.CALL_ANSWER_RECEIVED]:this.onCallAnswerReceived.bind(this),
            [CALL_TYPES.CALL_ICE_NEW_CANDIDATE_RECEIVED]:this.onNewIceCandidate.bind(this),
            [CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER_RECEIVED]:this.onOtherUserCloseTheCall.bind(this)
        }


        this.answerEventByReceiver = this.answerEventByReceiver.bind(this)
        this.onNewIceCandidate = this.onNewIceCandidate.bind(this)
        this.initCallAnswer = this.initCallAnswer.bind(this)
        this.initCall = this.initCall.bind(this)

        this.iceCandidates = []
        this.okayToSetRemoteDescription = false;
    }


    handle(payload){
        const {handlerOne} = payload;
        if(handlerOne && this.handlers[handlerOne]){
            this.handlers[handlerOne](payload);
        }
    }

    /**
     * set the web socket handler
     * @param {WebSocketHandler} handler 
     */
    setWebSocketHandler(handler){
        this.webSocketHandler = handler;
    }

    /**
     * set the data handler
     * @param {DataHandler} handler 
     */
    setDataHandler(handler){
        this.dataHandler = handler;
    }

    /**
     * set the visual handler
     * @param {VisualHandler} handler 
     */
    setVisualHandler(handler){
        this.visualHandler = handler;
    }



    /**
     * Initialize the call
     * Set the offer to take the call
     * @param {MediaStream} stream
     */
    async initCall(stream,onlyAudio=false){
        const {from} = getSelectedUsersID();
        this.from = from;
        this.onlyAudio = onlyAudio;

        this.peerConnection = new RTCPeerConnection(CALL_CONFIGURATION)
        
        this.peerConnection.addEventListener('icecandidate',(event) => {
            const {to} = getSelectedUsersID()
            if(event.candidate){
                const payload = {
                    mainHandler:MAIN_HANDLERS.CALL,
                    handlerOne:CALL_TYPES.CALL_ICE_NEW_CANDIDATE_CREATED,
                    candidate:event.candidate,
                    to:to
                }

                this.webSocketHandler.sendData(JSON.stringify(payload))
            }
        }
        )

         this.peerConnection.addEventListener('track',(event) => {
            const videoStream = event.streams[0]
            document.querySelector(".call-other-user-video").srcObject = videoStream;

        })

        stream.getTracks().forEach(e => {
            this.peerConnection.addTrack(e,stream);
        })

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer)
        const {to} = getSelectedUsersID()
        const payload = {
            mainHandler:MAIN_HANDLERS.CALL,
            handlerOne:CALL_TYPES.CALL_OFFER_CREATED,
            offer,
            to:to,
            from,
            onlyAudio
        }

        this.webSocketHandler.sendData(JSON.stringify(payload))
    }

    async initCallAnswer(offer){
       
        
        this.peerConnection.addEventListener('icecandidate',(event) => {
            if(event.candidate){
                const {to} = getSelectedUsersID()
                const payload = {
                    mainHandler:MAIN_HANDLERS.CALL,
                    handlerOne:CALL_TYPES.CALL_ICE_NEW_CANDIDATE_CREATED,
                    candidate:event.candidate,
                    to:to
                }

                this.webSocketHandler.sendData(JSON.stringify(payload))
            }
        }
        )

         this.peerConnection.addEventListener('track',(event) => {
            const videoStream = event.streams[0]
            if(this.onlyAudio){
                query(".call-only-audio-audio").srcObject = videoStream;
                return;
            }
            document.querySelector(".call-other-user-video").srcObject = videoStream;

        })
        
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        this.okayToSetRemoteDescription = true;
       

        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)
        return answer
    }


    async onCallOfferReceived(payload){
        const {offer,from,onlyAudio} = payload;
        this.from = from;
        this.onlyAudio  = onlyAudio;
        
        this.peerConnection = new RTCPeerConnection(CALL_CONFIGURATION);

        const contact = this.dataHandler.contacts.filter(e => e['contact'] === from)
        if(contact.length > 0){
            const user = contact[0]
            this.visualHandler.initCallReceiverDialogWithUserInfo(user)
        
        }



        this.lastOffer = offer;
    }

    async answerEventByReceiver(){
        const stream = await navigator.mediaDevices.getUserMedia({video:!this.onlyAudio,audio:true})

        stream.getTracks().forEach((e) => {
            this.peerConnection.addTrack(e,stream)
        })

        const answer = await this.initCallAnswer(this.lastOffer);
        const {to} = getSelectedUsersID()
        const userPayload = {
            mainHandler:MAIN_HANDLERS.CALL,
            handlerOne:CALL_TYPES.CALL_ANSWER_CREATED,
            answer,
            to
        }

        this.webSocketHandler.sendData(JSON.stringify(userPayload))
        this.visualHandler.setCallTab(!this.onlyAudio ? '3' : '5')

        for(let i = 0 ; i < this.iceCandidates.length;i++){
            await this.peerConnection.addIceCandidate(this.iceCandidates[i])
        }
    }

    async onCallAnswerReceived(payload){
        const {answer,to} = payload;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        this.okayToSetRemoteDescription = true;
        this.visualHandler.setCallTab(!this.onlyAudio ? '3' : '5')
        for(let i = 0 ; i < this.iceCandidates.length;i++){

            await this.peerConnection.addIceCandidate(this.iceCandidates[i])
        }
    }

    async onNewIceCandidate(payload){

        const {candidate} = payload;
        if(!this.peerConnection || !this.okayToSetRemoteDescription){
            this.iceCandidates.push(candidate)           
        }else{
            await this.peerConnection.addIceCandidate(candidate)
        }
       
    }

    async onOtherUserCloseTheCall(payload){
        const {to} = getSelectedUsersID()
        console.log("Other user closed the call ",payload)
        const contacts = this.dataHandler.contacts.filter(e => e.contact === to)
        if(contacts.length > 0 ){
            const contact = contacts[0]
            this.visualHandler.updateCallEndedBy(contact.name)
        }else{
            this.visualHandler.updateCallEndedBy("User")
        }
        
        this.visualHandler.setCallTab('4')
    }

    async closeCall(){
        this.peerConnection.close()
        const {to} = getSelectedUsersID()
        const userPayload = {
            mainHandler:MAIN_HANDLERS.CALL,
            handlerOne:CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER,
            to
        }
        this.webSocketHandler.sendData(JSON.stringify(userPayload))
        this.visualHandler.closeCallDialog()
    }



}