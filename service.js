// npm i @tensorflow/tfjs-node
const tf = require("@tensorflow/tfjs-node");
// npm i @tensorflow/tfjs-node-gpu
// require('@tensorflow/tfjs-node-gpu');
const posenet = require("@tensorflow-models/posenet");
const utils = require("./utils.js");

const { createCanvas, Image } = require("canvas");

const { workerData, parentPort } = require("worker_threads");

console.log(workerData, parentPort);
// You can do any heavy stuff here, in a synchronous way without blocking the "main thread"

const minPoseConfidence = 0.1;
const minPartConfidence = 0.5;
const skeletonColor = "#ffadea";
const skeletonLineWidth = 6;

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

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

async function estimatePoseOnImage(filePath, outputFilePath) {
  // load the posenet model from a checkpoint
  const net = await posenet.load({
    architecture: "ResNet50",
    outputStride: 32,
    inputResolution: 257,
    multiplier: 1.0,
    quantBytes: 4
  });

  image = await loadImage(filePath);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const input = tf.browser.fromPixels(canvas);
  const poses = await net.estimateSinglePose(
    input,
    imageScaleFactor,
    flipHorizontal,
    outputStride
  );

  console.log(poses);
  if (poses.score >= minPoseConfidence) {
    console.log("drawing keypoints");
    utils.drawKeyPoints(poses.keypoints, minPartConfidence, skeletonColor, ctx);
    console.log("drawing skeleton");
    utils.drawSkeleton(
      poses.keypoints,
      minPartConfidence,
      skeletonColor,
      skeletonLineWidth,
      ctx
    );
  }
  var dataUrl = canvas.toDataURL("image/png");
  //   console.log(dataUrl);
  var base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

  require("fs").writeFile(outputFilePath, base64Data, "base64", function(err) {
    // console.log(err);
  });

  parentPort.postMessage({ hello: poses });
  return poses;
}

let path = `/images/${workerData.originalname}`;
let imagepath = __dirname + `/images/${workerData.filename}`;
estimatePoseOnImage(imagepath, __dirname + path);
