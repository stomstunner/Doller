// so that async handler just make a method and export that 

//  promise wala function 

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export {asyncHandler}

// so the asyncHandler is a higher order fucntion = jo ki function ko as a parameter accept karte hai and return bhi kar sakte hai == treats it like a varibales 

// const asyncHandler = (fn) => { ()=> {} } // it accepts a fucntion 
    // so we can remove the outer curlly brackets
    // and if we want to make it a async fucntion ten we just have to write the async keyword in front of the 2nd paranthithis

// so jo ham fun pass kar rahe hai woh hai toh 1 fucntion hi toh usme hamre pass 4 chize hoti hai error , req, res, and next toh usko ham async ke ander use kar sakte hai 

// try catch wala fucntion

// const asyncHandler  = (fun) => async (req, res, next) => {
//     try {
//         await fun(req, res, next)
//     } catch (error) {
//         // so in the catch we have error handlinng
//         res.status(err.code || 500).json({
//             success : false,
//             massage : err.massage
//         })
//         // so we send the response ka as it is status aur usme ham bass user ka code ko pass kar denge ager nahi hoga toh ham 500 show kar denge and then usko ham json me conver kar denge jiske ander hamare pass 2 objects hai 1 st one is success jo ki false rahege frontend ke liye and jo massage hai usse as it is error se utha ke show kar denge 
//     }
// }