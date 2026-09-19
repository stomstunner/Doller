so we have  app.post ke ander routes then middlewares then we have the controllers

http status code notes = ![alt text](image-1.png)
![alt text](image.png)

JSON bhejna
    ↓
Express samajh leta hai

File bhejna
    ↓
Express nahi samajhta

Multer help karta hai


---

Example

User profile photo upload:

photo.jpg

Frontend:

<input type="file">

Request:

POST /upload-avatar

File bhi ja rahi hai.

Normal:

req.body

file ko read nahi kar sakta.

Multer Kya Karta Hai?
Incoming file pakadta hai
    ↓
Server me save karta hai
    ↓
req.file me daal deta hai
Route Example
router.post(
    "/avatar",
    verifyJWT,
    upload.single("avatar"),
    updateAvatar
)

Yahan:

upload.single("avatar")

multer middleware hai.

Controller Me
const avatarPath =
    req.file.path

Mil jayega.

Example:

{
    fieldname: "avatar",
    filename: "123.jpg",
    path: "./public/temp/123.jpg"
}
single() vs array()
Single File
upload.single("avatar")

Frontend:

<input name="avatar">

Result:

req.file
Multiple Files
upload.array(
    "images",
    5
)

Result:

req.files
Tumhare Project Me
Comments
GET comments
POST comments
PATCH comments
DELETE comments

Sirf:

verifyJWT

chahiye.

Kyunki user login hona chahiye.

Video Upload
POST /video

Yahan:

verifyJWT,
upload.fields([
    {
        name: "videoFile",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
])

Use karoge.

Yaad Rakhne Wala Rule
verifyJWT
    ↓
"Ye user kaun hai?"

multer
    ↓
"User ne kaunsi file bheji hai?"

Aur isi wajah se tumhare comment controllers me:

owner: req.user._id