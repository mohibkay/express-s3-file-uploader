require("dotenv").config();
const express = require("express");
const cors = require("cors");
const uploadToS3 = require("./services/uploadToS3");

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("Hello Express!");
});

app.post("/upload", async (req, res) => {
  try {
    const s3BucketResponse = await uploadToS3(req);

    const results = await Promise.all(
      s3BucketResponse.map(async (item) => {
        const documentUrl = item.Location;
        return { documentUrl };
      })
    );

    res.status(200).json({
      message: "Success",
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: "An error occurred.",
      error,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
