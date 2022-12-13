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

mongoClient.connect(url, (err, db) => {
    if (err) {
        console.log(err);
        console.log('Error while connecting mongo client');
    }
    else {
        const myDb = db.db('myDb');
        const collection = myDb.collection('myTable2');
        const collectiong = myDb.collection('myTable3');
        const collectionImg = myDb.collection('myimages');

        // 이메일 인증
        app.post('/check', (req, res)=> {
            const sendEmail  = req.body.email;

            const smtpTransport = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: email,
                    pass: password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const Checking = generateRandom(111111,999999)

            console.log(req.body.email);

            const mailOptions = {
                from: "Triple, 여행을 편안하게",
                to: sendEmail,
                subject: "[Triple] 인증 관련 이메일 입니다",
                text: "오른쪽 숫자 6자리를 입력해주세요 : " + Checking
            };

            const mailToCheking = {
                email : req.body.email,
                Checking : Checking
            }

            console.log(Checking);

            smtpTransport.sendMail(mailOptions, (error) => {
                if (error) {
                    console.log("에러입니다.");
                    console.log(error);
                }
                else {
                    /* 클라이언트에게 인증 번호를 보내서 사용자가 맞게 입력하는지 확인! */
                    console.log("정상 실행");
                    res.status(200).send(mailToCheking);
                }
                smtpTransport.close();
            });


        });


        //회원가입
        app.post('/signup', (req, res) => {

            const newUser = {
                email : req.body.email,
                name : req.body.name,
                password : req.body.password,
                job : req.body.job,
            };

            const query = {email: newUser.email};

            collection.findOne(query, (err, result) => {
                if(result == null) {
                    collection.insertOne(newUser, (err, result) => {
                        res.status(200).send();
                    });
                } else {
                    res.status(404).send();
                }
            });

        });

}
});

app.listen(3000, () => {
    console.log("listening on port 3000....");
});