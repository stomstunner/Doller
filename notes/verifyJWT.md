User login karta hai
    ↓
Server token deta hai
    ↓
User har request ke saath token bhejta hai
    ↓
verifyJWT check karta hai
    ↓
Token valid hai ya nahi

{
    accessToken:
    "eyJhbGciOiJIUzI1NiIs..."
}

Browser cookie me save ho gaya.

Ab user request bhejta hai:

GET /api/v1/comments/video/123

router.get(
    "/video/:videoId",
    verifyJWT,
    getVideoComments
)


Request
   ↓
verifyJWT
   ↓
Token verify
   ↓
req.user set
   ↓
Controller