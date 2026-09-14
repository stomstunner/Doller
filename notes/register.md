## for registering the new user, we need to send the following data in the request body:
1. `name` - User's name (String)
2. `email` - User's email (String)          
3. `password` - User's password (String)
4. `avatar` - User's avatar image (File) - Required
5. `coverImage` - User's cover image (File) - Optional

----

after registering we have to login the user with the following data in the request body:
1. `email` - User's email (String)
2. `password` - User's password (String)

---

then we can see all the details of the user in /history, /login, /profile, /logout, /update-password, /update-profile, /delete-profile, /forgot-password, /reset-password routes.

----
also in the url of the getuserchannelprofile /user/c/username
















# User Registration Error

Registration ke time `coverImage` ki wajah se `500 Internal Server Error` aa raha tha.
Error message me `coverImage: Cast to String failed` dikh raha tha.
Iska matlab tha ki Mongoose ko `coverImage` me string value chahiye thi.

Lekin controller ke andar `coverImage` ko object ke form me save kiya ja raha tha:

```js
coverImage: {
    url: coverImage?.secure_url || coverImage?.url || "",
    publicId: coverImage?.public_id || "",
}
```

Dusri taraf user model me `coverImage` ko pehle sirf `String` define kiya gaya tha:

```js
coverImage: {
    type: String,
    publicId: String,
}
```

Is mismatch ki wajah se Mongoose object ko string me convert nahi kar paa raha tha.
Error me `Cast to String failed` isi problem ko show kar raha tha.

Problem solve karne ke liye model ka `coverImage` structure controller ke according update kiya gaya:

```js
coverImage: {
    url: {
        type: String,
        default: "",
    },
    publicId: {
        type: String,
        default: "",
    },
},
```

Ab controller ka object model ke structure ke saath match karta hai.
`url` aur `publicId` dono fields optional hain aur unki default value empty string hai.
Isliye user cover image ke bina bhi register ho sakta hai.

Avatar abhi bhi required hai, kyunki registration ke liye avatar mandatory rakha gaya hai.
Postman me `avatar` ka type **File** select karke actual image attach karni hogi.
`coverImage` optional hai, isliye use blank bhi chhoda ja sakta hai.

JavaScript syntax validation ke liye ye commands run ki gayi:

```bash
node --check src/models/user.models.js
node --check src/controllers/user.controller.js
```

Dono files ka syntax successfully validate ho gaya.
