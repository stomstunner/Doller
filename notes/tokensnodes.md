## here we see about the access token jwt

jwt is a brearrer token matab jiske pass bhi token hoga usse ham apna data de denge it is like the key

lets write the access token secret and the access token expiry in the .env file

## ACCESS_TOKEN_SECRET

jo hamara access token secret key hota hai usse ham database me store nahi karte hai balki ham sirf
access token generate karte hai aur usse user ko de dete hai aur jab bhi user hamare server per request karega to usse access token bhejna padega jisse ham verify karenge ki ye user valid hai ya nahi
iska time 15 min ka hota hai aur isse ham access token generate karte hai

## REFRESH_TOKEN_SECRET

isko hi store karte hai refresh token ke liye kyuki ye hamare server per hi generate hota hai aur ye user ke pass nahi jata hai isliye isse ham database me store karte hai
iska time 1 year ka hota hai aur isse ham access token generate karte hai jab bhi user ka access token expire ho jata hai to ham refresh token ke help se access token generate karte hai

---

ye dono ka kaam hai ki jab bhi user ka access token expire ho jata hai to ham refresh token ke help se access token generate karte hai aur ye dono kaam ham jwt ke help se karte hai

ye dono ka kaam detail me ham yahi dekhnege section wise to suru karte hai

## Access token aur refresh token ka flow

1. User login karta hai aur server email/password verify karta hai.
2. Verify hone ke baad server access token aur refresh token generate karta hai.
3. Access token ko short time ke liye client ko diya jata hai. Client har protected request ke saath ise bhejta hai.
4. Server access token ko verify karke user ko response deta hai.
5. Jab access token expire ho jata hai, client refresh token bhejta hai.
6. Server refresh token verify karke naya access token generate karta hai.
7. Refresh token invalid ya expire ho jaye to user ko dobara login karna padega.

## Environment variables

```env
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=1y
```

Secret keys ko strong aur alag rakhna chahiye. Inhe `.env` file me rakhein aur `.gitignore` me `.env` add karein.

## Access token generator

Access token me user ki zaroori information, jaise `userId`, payload ke roop me rakhi ja sakti hai. Isme password ya koi sensitive data nahi rakhna chahiye.

```js
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
};
```

## Refresh token generator

Refresh token ka expiry time bada hota hai. Isse database me user ke saath store karke verify kiya ja sakta hai.

```js
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
};
```

## Request me access token bhejna

Access token ko normally `Authorization` header me Bearer token ke roop me bhejte hain:

```http
Authorization: Bearer <access_token>
```

Server pehle `Bearer` ke baad wale token ko extract karta hai, phir `jwt.verify()` se validate karta hai. Token valid hone par decoded `userId` ko request object me set karke protected controller ko request forward ki jati hai.

## Refresh endpoint

Access token expire hone par client refresh endpoint par refresh token bhejta hai. Server refresh token ko verify karta hai, database me uska record check karta hai aur naya access token return karta hai. Refresh token ko rotate karna aur logout ke samay revoke karna security ke liye behtar hai.

```js
const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

const accessToken = generateAccessToken(decoded.userId);
```

Refresh token ko browser application me `httpOnly`, `secure` aur suitable `sameSite` options wali cookie me rakhna safer hota hai. HTTPS production me zaroor use karein.

---

// and now we make the accesstoken generator and then refress token generator
