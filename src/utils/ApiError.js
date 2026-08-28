// so we just wnat to standerdized the error filed and 

class ApiError extends Error{
    constructor(
        statusCode,
        massage = "Something went wrong",
        errors = [],
        stack = ""
        // this is the error stack  and status code matlab kya code hai user ka 
    ){
        // here we just overwrite the constructor
        super(massage)
        this.statusCode = statusCode
        this.data = null
        this.massage = massage
        this.success = false
        this.errors = errors


        // this is the production grade code for better error detection
        if(stack){
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}