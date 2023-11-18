const formidable = require("formidable");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");
const Transform = require("stream").Transform;

const accessKeyId = process.env.S3_ACCESS;
const secretAccessKey = process.env.S3_SECRET;
const region = process.env.S3_REGION;
const Bucket = process.env.S3_BUCKET;

const uploadToS3 = async (req) => {
  return new Promise(async (resolve, reject) => {
    let options = {
      maxFileSize: 1000 * 1024 * 1024, // 1000 megabytes converted to bytes
      allowEmptyFiles: false,
      multiples: true, // Enable parsing multiple files
    };

    const form = formidable(options);

    const uploadedFiles = []; // Store uploaded files here

    form.on("fileBegin", (formName, file) => {
      file.open = async function () {
        this._writeStream = new Transform({
          transform(chunk, encoding, callback) {
            callback(null, chunk);
          },
        });

        this._writeStream.on("error", (e) => {
          form.emit("error", e);
        });

        const originalFilename = file.name || "Invoice";

        new Upload({
          client: new S3Client({
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
            region,
          }),
          params: {
            ACL: "public-read",
            Bucket,
            Key: `${Date.now().toString()}-${originalFilename}`,
            Body: this._writeStream,
          },
          tags: [],
          queueSize: 4,
          partSize: 1024 * 1024 * 5,
          leavePartsOnError: false,
        })
          .done()
          .then((data) => {
            uploadedFiles.push(data); // Store the result in the array
            if (uploadedFiles.length === form.openedFiles.length) {
              // All files have been uploaded
              resolve(uploadedFiles);
            }
          })
          .catch((err) => {
            form.emit("error", err);
          });
      };

      file.end = function (cb) {
        this._writeStream.on("finish", () => {
          this.emit("end");
          cb();
        });
        this._writeStream.end();
      };
    });

    form.on("error", (error) => {
      reject(error.message);
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(err);
      }
    });

    await Promise.all(uploadedFiles);
  });
};

module.exports = uploadToS3;
