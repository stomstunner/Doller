// so here we make the api response for the data 

class ApiResponse{
    constructor(statusCode, data, massage = "Success"){
        this.statusCode = statusCode
        this.data = data 
        this.massage = massage
        this.success = statusCode < 400
    }
}

export { ApiResponse }