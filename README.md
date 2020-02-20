# posenet-nodeserver

This is a node express server used to upload images and run posenet model on them.

## Getting Started

- Clone this repository.
- Open a terminal and run `npm install`
- Run `node index.js` in terminal

- Upload an image to `localhost:8080/images/upload` as POST request with form-data: key = 'image' value = file & key='isSingle' value= true
- The server returns a callback in response

```
    "message": "Processed Image",
    "path": "/images/download.jpeg",
    "poses": "[]"
```

- Go to localhost:8080/images/filename.jpeg to see the results.
- NB: The server may take sometime to process the image depending on the system.
- Retry callback path until you get the results.
