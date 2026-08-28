import multer from "multer";

const multer = require('multer');

const storage = multer.diskStorage({
    // yaha pe hamre pass request to user se aata hai json me hota hai
    // but jo ye file hai woh aata hai multer se 
    // and cb = callback
  destination: function (req, file, cb) {
    // Specify your folder path here (make sure the folder exists)

    // and we keep the all file in the public ke ander jo temp hai uske ander 
    cb(null, './uploads'); 
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

export const upload = multer({ storage: storage });