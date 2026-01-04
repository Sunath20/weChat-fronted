export class WebSocketMessageModel {
   

    constructor(payload){
        this.content = payload['content']
        this.from = payload['from']
        this.to = payload['to']
        this.createdAt = payload['createdAt']    
        this.mainHandler = payload['mainHandler']
        this.handlerOne = payload['handlerOne']
    }
}


export class DatabaseMessageModel {
    constructor(payload){
        this.content = payload['content']
        this.sentById = payload['sentbyid']
        this.createdAt = payload['createdat'] || payload['createdAt']
        this.updatedAt = payload['updatedAt']
        this.roomId = payload['roomId']
        this.contentType = payload['contentType']
    }
}

export class DataHandlerMessageModel extends DatabaseMessageModel{
    constructor(payload){
        super(payload);
        this.fromUser = payload['fromUser']
        this.friend = payload['friend']
    }
}


export class FormattedDataHandlerMessageModel extends DataHandlerMessageModel {
    constructor(payload){
        super(payload)
        this.dateTag = payload['dateRenderTag']
        this.timeTag = payload['timeRenderTag']
    }
}
