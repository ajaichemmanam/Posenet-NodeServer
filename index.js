const express = require("express");
const multer = require("multer");
var mime = require("mime-types");
const fs = require("fs");
const app = express();
const router = express.Router();

const port = process.env.PORT || 8080;

const { Worker } = require("worker_threads");

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./service.js", { workerData });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

async function run(file) {
  const result = await runService(file);
  console.log(result);
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "images/");
  },
  filename: (req, file, cb) => {
    return cb(null, Date.now() + "-" + file.originalname);
  }
});

let upload = multer({
  storage: storage,
  limits: { fileSize: 10000000, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return callback(
        new Error("Only jpg, jpeg, png images are allowed !"),
        false
      );
    }

    callback(null, true);
  }
}).single("image");

router.post("/images/upload", (req, res) => {
  upload(req, res, function(err) {
    if (err) {
      res.status(400).json({ message: err.message });
    } else {
      let path = `/images/${req.file.originalname}`;
      run(req.file).catch(err => console.error(err));
      res.status(200).json({
        message: "Image Uploaded Successfully ! See Callback Path",
        path: path
      });
    }
  });
});

router.get("/images/:imagename", (req, res) => {
  let imagename = req.params.imagename;
  let imagepath = __dirname + "/images/" + imagename;
  let image = fs.readFileSync(imagepath);
  let mimeType = mime.lookup(image);

  res.writeHead(200, { "Content-Type": mimeType });
  res.end(image, "binary");
});

app.use("/", router);

app.use((err, req, res, next) => {
  if (err.code == "ENOENT") {
    res.status(404).json({ message: "Image Not Found !" });
  } else {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port);
console.log(`App Runs on ${port}`);
