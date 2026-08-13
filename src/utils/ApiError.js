// so we just wnat to standerdized the error filed and 

class ApiError extends Error{
    constructor(
        statusCode,
        massage = "Something went wrong",
        errors = [],
        statck = ""
        // this is the error statck  and status code matlab kya code hai user ka 
    ){
        // here we just overwrite the constructor
        super(massage)
        this.statusCode = statusCode
        this.data = null
        this.massage = massage
        this.success = false
        this.errors = errors


        // this is the production grade code for better error detection
        if(statck){
            this.statck = statck
        }
        else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}