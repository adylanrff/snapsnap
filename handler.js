const serverless = require("serverless-http");
const express = require("express");
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const AWS = require('aws-sdk');
const upload = multer({})

const S3 = new AWS.S3({
  s3ForcePathStyle: true,
  accessKeyId: process.env.S3_ACCESS_ID,
  secretAccessKey: process.env.S3_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT && new AWS.Endpoint(process.env.S3_ENDPOINT),
});

app.use(express.json());

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.post("/upload" ,upload.single('image'), async (req, res, next) => {

  const hashSum = crypto.createHash('sha256');
  hashSum.update(req.file.buffer);
  const key = hashSum.digest('hex');

  try {
    const originalFile = await uploadToS3(process.env.SNAP_IMAGES_BUCKET_NAME, key, req.file.buffer, req.file.mimetype)  
    const signedUrl = S3.getSignedUrl("getObject", { Bucket: originalFile.Bucket, Key: key, Expires: 60000 })
    return res.status(200).json({
      imageUrl: signedUrl,
    });
    
  } catch (err) {
    return res.status(500).json({
      message: "Error uploading to S3",
      error: err
    })
  }

});

const uploadToS3 = (bucket, key, buffer, mimeType) =>
    new Promise((resolve, reject) => {

        S3.upload(
            { Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType },
            function(err, data) {
                if (err) reject(err);
                resolve(data)
            })
    })

module.exports.handler = serverless(app);
