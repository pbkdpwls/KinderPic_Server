const express = require('express');
const app = express();

const mongoClient = require('mongodb').MongoClient;
const nodemailer = require('nodemailer');

const fs  = require('fs');
const path = require("path");

const multer = require('multer');
const fileUpload = require('express-fileupload');

const AWS = require('aws-sdk');
const personal_info = require("/credential/personal_info");

app.use(express.json());
app.use(express.static('public'));

const s3 = new AWS.S3({
    accessKeyId: personal_info.keyId,
    secretAccessKey: personal_info.accessKey,
    region: "ap-northeast-2"
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
      },
      filename: function (req, file, cb) {
        cb(null, new Date().valueOf() + path.extname(file.originalname));
      }
});

AWS.config.update({region: 'ap-northeast-2'});
AWS.config.loadFromPath('./credentials.json');

const url = "mongodb://localhost:27017";
const upload = multer({storage: storage});

/* min ~ max까지 랜덤으로 숫자를 생성하는 함수 */
var generateRandom = function (min, max) {
    var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
    return ranNum;
}

var rekognition = new AWS.Rekognition();

// 인물분류
function searchByImage(image, cb) {
    var params = {
        CollectionId: "kinders",
        Image: {
            Bytes: image.data.buffer
        }
    };

    rekognition.searchFacesByImage(params, function(err, data) {
        if(err) {
            console.log(err, err.stack);

            cb({})
        }
        else {
            console.log(data);
            const imageMatches = data.FaceMatches.filter(function(match){ return match.Face.ExternalImageId !== undefined;})
                .map(function(image){return image.Face.ExternalImageId;})
                .map(function(s3ObjectKey){return "https://kindersbucket.s3.ap-northeast-2.amazonaws.com/"+s3ObjectKey;})

            cb(imageMatches);
        }
    });
}

app.listen(3000, () => {
    console.log("listening on port 3000....");
});