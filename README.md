# posenet-nodeserver

This is a node express server used to upload images and run posenet model on them.

## Getting Started

- Clone this repository.
- Open a terminal and run `npm install`
- Run `node index.js` in terminal

- Upload an image to `localhost:8080/images/upload` as POST request with form-data: key = 'image' value = file
- The server returns a callback in response

```
{
    "message": "Image Uploaded Successfully ! See Callback Path",
    "path": "/images/filename.jpeg"
}
```

- Go to localhost:8080/images/filename.jpeg to see the results.
- NB: The server may take sometime to process the image depending on the system.
- Retry callback path until you get the results.
