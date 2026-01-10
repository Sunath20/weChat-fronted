// const data = {
//   from: '+94702910864',
//   to: '+94712050175',
//   content: 'no problem ',
//   mainHandler: 2,
//   handlerOne: 4,
//   _id: 'ba893529-6c01-4648-97e7-ba5fa18fb4b2',
//   createdat: 2026-01-05T17:45:12.973Z,
//   updatedat: 2026-01-05T17:45:12.973Z,
//   roomid: '5db6a1e2-254c-439a-8732-19814fdc26a6',
//   sentbyid: '+94702910864',
//   contenttype: 'Message',
//   userread: null,
//   userreceivedat: null,
//   userreadmessageat: null
// }

export class DatabaseMessageModel {
    constructor(payload){
        
        this.messageID = payload['_id'] || payload['messageID']
        this.content = payload['content']
        this.sentById = payload['sentbyid'] || payload['sentById']
        this.createdAt = payload['createdat'] || payload['createdAt']
        this.updatedAt = payload['updatedAt'] || payload['updatedat']
        this.roomId = payload['roomId'] || payload['roomid']
        this.contentType = payload['contentType'] || payload['contenttype']
        this.userRead = payload['userread'] || payload['userRead']
        this.userReceivedAt = payload['userreceivedat'] || payload['userReceivedAt']
        this.userReadMessageAt = payload['userreadmessageat'] || payload['userReadMessageAt']

    }
}


export class WebSocketMessageModel  extends DatabaseMessageModel{
   

    constructor(payload){
        super(payload)
        this.messageID = payload['messageId'];
        this.content = payload['content']
        this.from = payload['from']
        this.to = payload['to']
        this.createdAt = payload['createdAt']    
        this.mainHandler = payload['mainHandler']
        this.handlerOne = payload['handlerOne']
        
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
