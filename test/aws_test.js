const AWS = require('aws-sdk');
const express = require('express');
const fileUpload = require('express-fileupload');
const { imageTensorToCanvas } = require('face-api.js');
const { createBrowserEnv } = require('face-api.js/build/commonjs/env/createBrowserEnv');
const app = express();
const fs  = require('fs');
require('dotenv').config({path: __dirname + '\\' + '.env'});
var resultimage;
app.use(fileUpload());

AWS.config.update({region: 'ap-northeast-2'});
AWS.config.loadFromPath('./credentials.json');

var rekognition = new AWS.Rekognition();
const s3 = new AWS.S3({
    accessKeyId: ,
    secretAccessKey: ,
    region: "ap-northeast-2"
});

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

app.use(express.static('public'));

app.post('/upload', function(req, res) {

    console.log("uploading file");
    console.log(req.files.facetosearch.name);
    if (!req.files)
        return res.status(400).send('No files were uploaded.');

    const uploadedImage = req.files.facetosearch;

    searchByImage(uploadedImage, function(images){
        var html = "<html><body>"

        images.forEach(function(imageSrc) {
            html = html + "<img src='" + imageSrc + "' width=300 />"
        })

        var param = {
            'Bucket':'kindersbucket',
            'Key': 'image/' + 'kid',
            'ACL':'public-read',
            'Body':fs.createReadStream(req.files.facetosearch.name),
            'ContentType':'image/png'
        }

        s3.upload(param, function(err, data){
            console.log(err);
            console.log(data);
        });
        html = html + "</body></html>"
        res.send(html);
    })
});

app.listen(3000, () => {
    console.log("listening on port 3000....");
});