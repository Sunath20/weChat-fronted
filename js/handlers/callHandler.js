import { getSelectedUsersID, query, readData } from "../utils.js";
import { DataHandler } from "./dataHandler.js";
import {WebSocketHandler } from "./requestHandling.js";
import { VisualHandler } from "./visualHandler.js";
import { MAIN_HANDLERS, MESSAGE_TYPES,CALL_TYPES,FILE_TYPES,USER_HANDLES, CALL_EVENTS } from "../core/Actions.js"
import { eventBus } from "../core/EventBus.js";


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
        this.sendIceCandidatesToOtherUser = this.sendIceCandidatesToOtherUser.bind(this)
        this.connectTracks = this.connectTracks.bind(this)
        this.addReceivedIceCandidatesBeforeRemoteDescription = this.addReceivedIceCandidatesBeforeRemoteDescription.bind(this)

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
     * Notification will be send via the web socket for the other user
     * With the RTC Offer object
     * @param {MediaStream} stream
     */
    async initCall(onlyAudio=false){
        const {from,to} = getSelectedUsersID();
        this.from = from;
        this.to = to;
        this.onlyAudio = onlyAudio;
        const stream = await navigator.mediaDevices.getUserMedia({video:true})
        this.localStream = stream;

        this.peerConnection = new RTCPeerConnection(CALL_CONFIGURATION)
        this.sendIceCandidatesToOtherUser()
        this.connectTracks()

        stream.getTracks().forEach(e => {
            this.peerConnection.addTrack(e,stream);
        })

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer)
        
        const payload = {
            mainHandler:MAIN_HANDLERS.CALL,
            handlerOne:CALL_TYPES.CALL_OFFER_CREATED,
            offer,
            to:to,
            from,
            onlyAudio
        }

        eventBus.emit(CALL_EVENTS.CALL_OFFER_CREATED,payload)
    }
    
    /**
     * Listen to ice candidates in the current peer connection
     * Send the ice candidates via the web socket to the selected user
     */
    sendIceCandidatesToOtherUser(){
        this.peerConnection.addEventListener('icecandidate',(event) => {
            if(event.candidate){
                const payload = {
                    mainHandler:MAIN_HANDLERS.CALL,
                    handlerOne:CALL_TYPES.CALL_ICE_NEW_CANDIDATE_CREATED,
                    candidate:event.candidate,
                    to:this.to
                }
                
                this.webSocketHandler.sendData(JSON.stringify(payload))
            }
        }
        )
    }


    /**
     * Connect the audio or video stream.
     * Meaning when the connection receive a stream we will set it as a stream in our browser.
     */
    connectTracks(){
        this.peerConnection.addEventListener('track',(event) => {
            const videoStream = event.streams[0]
            // if(this.onlyAudio){
            //     query(".call-only-audio-audio").srcObject = videoStream;
            //     return;
            // }
            document.querySelector(".call-other-user-video").srcObject = videoStream;

        })
    }

    /**
     * Create a answer base on the given offer.
     * Begin to listen to ice candidates.
     * Begin to listen to tracks.
     * Set the remote and local descriptions.
     * Returns the answer.
     * @param {*} offer 
     * @returns 
     */
    async initCallAnswer(offer){
        const {to} = getSelectedUsersID()
        this.to = to;
        this.sendIceCandidatesToOtherUser()
        this.connectTracks()
        
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        this.okayToSetRemoteDescription = true;
       

        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)
        return answer
    }

    /**
     * When we receive the offer via websocket this will take place.
     * Moreover we will take the call only happens with only audio or not
     * Initialize the peer connection
     * Visualize the caller details
     * @param {*} payload 
     */
    async onCallOfferReceived(payload){
        const {offer,from,onlyAudio} = payload;
        this.from = from;
        this.onlyAudio  = false;
        
        this.peerConnection = new RTCPeerConnection(CALL_CONFIGURATION);
        this.lastOffer = offer;
    }

    /**
     * When the user accept the call (Click the Accept button).
     * Initialize the stream for the receiver user.
     * Add the tracks to the peer connection.
     * Initialize the call answer.
     * Send the answer object to the caller via web socket.
     * Add the ice candidates that were given in the time period before setting remote description.
     */
    async answerEventByReceiver(){
        const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
        this.localStream = stream;
        stream.getTracks().forEach((e) => {
            this.peerConnection.addTrack(e,stream)
        })

        const answer = await this.initCallAnswer(this.lastOffer);
     
        const userPayload = {
            mainHandler:MAIN_HANDLERS.CALL,
            handlerOne:CALL_TYPES.CALL_ANSWER_CREATED,
            answer,
            to:this.to,
            onlyAudio:this.onlyAudio
        }

        eventBus.emit(CALL_TYPES.CALL_ANSWER_CREATED,userPayload)
        await this.addReceivedIceCandidatesBeforeRemoteDescription()
    }

    /**
     * Call answer received back to the caller via web socket.
     * Set the remote description.
     * add the missed ice candidates.
     * set the visual appearance for the call.
     * @param {*} payload 
     */
    async onCallAnswerReceived(payload){
        const {answer,to} = payload;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.okayToSetRemoteDescription = true;
        await this.addReceivedIceCandidatesBeforeRemoteDescription()
    }

    /**
     * Add the ice candidates in the iceCandidate list
     */
    async addReceivedIceCandidatesBeforeRemoteDescription(){
          for(let i = 0 ; i < this.iceCandidates.length;i++){

            await this.peerConnection.addIceCandidate(this.iceCandidates[i])
        }


    }

    /**
     * When we receive a ice candidate instance via the web socket.
     * Directly added when the remote description added otherwise added to the list to execute as soon as set the remote description.
     * @param {*} payload 
     */
    async onNewIceCandidate(payload){

        const {candidate} = payload;
        if(!this.peerConnection || !this.okayToSetRemoteDescription){
            this.iceCandidates.push(candidate)           
        }else{
            await this.peerConnection.addIceCandidate(candidate)
        }
       
    }

    /**
     * Event will be triggered when we receive the signal from other user that call has been ended.
     * Signal comes via the web socket
     * @param {*} payload 
     */
    async onOtherUserCloseTheCall(contact){
        this.visualHandler.updateCallEndedBy(contact.name)
        this.visualHandler.setCallTab('4')
    }

    /**
     * Close the call between two users
     * Closed signal gonna send via the web socket for the other user
     * Visual handler has been set so this function will handle the closing dialog
     */
    async closeCall(emitEvent=true){
        
        this.localStream?.getTracks().forEach(e => {
            e.stop()
        })

        this.peerConnection?.close()


           // Reset state
        this.peerConnection = null;
        this.localStream = null;
        this.iceCandidates = [];
        this.okayToSetRemoteDescription = false;

        if(emitEvent){
            eventBus.emit(CALL_TYPES.CALL_WAS_DISCONNECTED_BY_USER,{to:this.to})
        }
        
    }

    /**
     * 
     * @param {MediaStream} payload 
     */
    async setLocalStream(stream){
        stream.getTracks().forEach(e => {
            this.peerConnection.addTrack(e,stream)
        })
    }
}

export const callHandler = new CallHandler()