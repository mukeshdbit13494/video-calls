const express = require("express");
const app = express();
const http = require("http").createServer(app);
const port = process.env.PORT || 3000;

const io = require("socket.io")(http);

// app.get("/", (req, res, next) => {
//   res.status(200).json({
//     message: "Hello i am using node.js",
//   });
// });

app.use(express.static("public"));

http.listen(port, () => {
  console.log("Sever set up with port : " + port);
});

io.on("connection", (socket) => {
  console.log("User Connected");
  socket.on("create or join", (room) => {
    console.log("create or join to room " + room);
    const numRoom = io.sockets.adapter.rooms[room] || { length: 0 };
    let numClient = numRoom.length;
    console.log(room, "has", numClient, "clients");
    if (numClient == 0) {
      socket.join(room);
      socket.emit("created", room);
    } else if (numClient == 1) {
      socket.join(room);
      socket.emit("joined", room);
    } else {
      socket.emit("full", room);
    }
  });
  socket.on("ready", (room) => {
    socket.broadcast.to(room).emit("ready");
  });

  socket.on("candidate", (event) => {
    socket.broadcast.to(event.room).emit("candidate", event);
  });

  socket.on("offer", (event) => {
    socket.broadcast.to(event.room).emit("offer", event.sdp);
  });

  socket.on("answer", (event) => {
    socket.broadcast.to(event.room).emit("answer", event.sdp);
  });
});
