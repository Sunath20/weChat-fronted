import { getSelectedUsersID } from "../utils.js";
import { APIHandler, FILE_TYPES, MAIN_HANDLERS, WebSocketHandler } from "./requestHandling.js";


export class FileHandler {


    constructor(){
        
    }

    
   /**
    * Set the API Handler
    * @param {APIHandler} apiHandler 
    */ 
   setAPIHandler(apiHandler){
        this.apiHandler = apiHandler
        this.serverBase = this.apiHandler.getServerBase()
   }

    /**
     * 
     * @param {File} file 
     */
    async fileSendStart(file,callback){
        const fileName = file.name;
        const {personOne,personTwo} = getSelectedUsersID(true)
        const {from} = getSelectedUsersID()

        const localPath = "/files/startFileUpload"
        const url = new URL(this.serverBase+localPath)
        const query = url.searchParams
        query.set('personOne',personOne);
        query.set('personTwo',personTwo);
        query.set('fileName',fileName);
        query.set('sentByID',from)

        

        const response = await (fetch(url.toString(),{method:"GET"}).then(e => e.json()))
        const updatingFilePath = response['filePath']
        const newURl = this.serverBase + `/files/updateFile/${updatingFilePath}`
        let offset = 0;
        let chunkIndex = 0;
        const chunkSize = 1024*1024

        const totalChunks = Math.ceil(file.size / chunkSize);
        
        while(offset < file.size){
            const slice = file.slice(offset,offset+chunkSize);
            const buffer = await slice.arrayBuffer()
            console.log("Sending the chuck number ",chunkIndex+1)
            const response = await  fetch(newURl,{
                method:"POST",
                headers:{
                    "Content-Type": "application/octet-stream",
                    "X-Chunk-Index": chunkIndex,
                    "X-File-Name": file.name,
                    "X-File-Size": file.size
                },
                body:buffer,
            })

            if(!response.ok){
                console.log("File upload failed.Backing up now")
                break;
            }
            
            if(callback){
                callback(chunkIndex + 1, totalChunks)
            }
            offset = offset + chunkSize
            chunkIndex += 1;


        }
    }

    async sendFileData(updateFilePath,chuck,chuckIndex){

    }

}