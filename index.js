// // npm i @tensorflow/tfjs-node
// const tf = require("@tensorflow/tfjs-node");
// // npm i @tensorflow/tfjs-node-gpu
// // require('@tensorflow/tfjs-node-gpu');
const posenet = require("@tensorflow-models/posenet");

const utils = require("./utils.js");

const express = require("express");
const multer = require("multer");
var mime = require("mime-types");
const fs = require("fs");
const app = express();
const router = express.Router();

const { createCanvas, Image } = require("canvas");

const port = process.env.PORT || 8080;

const minPoseConfidence = 0.1;
const minPartConfidence = 0.5;
const skeletonColor = "#ffadea";
const skeletonLineWidth = 6;

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

config = {
  architecture: "ResNet50",
  outputStride: 32,
  inputResolution: 257,
  multiplier: 1.0,
  quantBytes: 4
};

var net = 0;

loadModel(config)
  .then(model => {
    console.log("Loaded Model");
    net = model;
  })
  .catch(err => {
    console.log(err);
  });

async function loadModel(config) {
  // load the posenet model from a checkpoint
  return await posenet.load(config);
}

async function loadImage(path) {
  let image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => {
      resolve(image);
    };
  });
  image.src = path;

  return promise;
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

// const upload = multer({
//   dest: "images/",
//   limits: { fileSize: 10000000, files: 1 },
//   fileFilter: (req, file, callback) => {
//     if (!file.originalname.match(/\.(jpg|jpeg)$/)) {
//       return callback(new Error("Only Images are allowed !"), false);
//     }

//     callback(null, true);
//   }
// }).single("image");

async function estimatePoseOnImage(filePath, outputFilePath, isSingle = true) {
  image = await loadImage(filePath);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const input = tf.browser.fromPixels(canvas);
  var poses = 0;
  if (isSingle) {
    poses = await net.estimateSinglePose(
      input,
      imageScaleFactor,
      flipHorizontal,
      outputStride
    );

    console.log(poses);
    if (poses != 0) {
      if (poses.score >= minPoseConfidence) {
        console.log("drawing keypoints");
        utils.drawKeyPoints(
          poses.keypoints,
          minPartConfidence,
          skeletonColor,
          ctx
        );
        console.log("drawing skeleton");
        utils.drawSkeleton(
          poses.keypoints,
          minPartConfidence,
          skeletonColor,
          skeletonLineWidth,
          ctx
        );
      }
    }
  } else {
    poses = await net.estimateMultiplePoses(
      input,
      imageScaleFactor,
      flipHorizontal,
      outputStride,
      5 // maxPoseDetections
    );

    poses.forEach(({ score, keypoints }) => {
      // console.log(score, keypoints)
      if (score >= minPoseConfidence) {
        console.log("drawing keypoints");
        utils.drawKeyPoints(keypoints, minPartConfidence, skeletonColor, ctx);
        console.log("drawing skeleton");
        utils.drawSkeleton(
          keypoints,
          minPartConfidence,
          skeletonColor,
          skeletonLineWidth,
          ctx
        );
      }
    });
  }

  var dataUrl = canvas.toDataURL("image/png");
  //   console.log(dataUrl);
  var base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

  require("fs").writeFile(outputFilePath, base64Data, "base64", function(err) {
    // console.log(err);
  });
  return poses;
}

router.post("/images/upload", (req, res) => {
  if (net == 0) {
    res.status(201).json({
      message: "Loading Model. Please try later"
    });
  } else {
    upload(req, res, function(err) {
      if (err) {
        res.status(400).json({ message: err.message });
      } else {
        let path = `/images/${req.file.originalname}`;
        let imagepath = __dirname + `/images/${req.file.filename}`;
        estimatePoseOnImage(imagepath, __dirname + path, (isSingle = false));
        res.status(200).json({
          message: "Image Uploaded Successfully ! See Callback Path",
          path: path
        });
      }
    });
  }
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
