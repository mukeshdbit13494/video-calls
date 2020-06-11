let divSelectRoom = document.getElementById("selectRoom");
let divConsultingRoom = document.getElementById("consultingRoom");
let inputRoomNumber = document.getElementById("roomNumber");
let btnGoRoom = document.getElementById("goRoom");
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let roomNumber, localStream, remoteStream, rtcPeerConnect, isCaller;
navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
const iceServers = {
  iceServer: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};
const socket = io();
const streamConstraints = {
  video: true,
  audio: true,
};

btnGoRoom.onclick = () => {
  if (inputRoomNumber.value === "") {
    alert("Please Type room name");
  } else {
    roomNumber = inputRoomNumber.value;
    socket.emit("create or join", roomNumber);
    divConsultingRoom.style = "display:block";
    divSelectRoom.style = "display:none";
  }
};

socket.on("created", (room) => {
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = stream;
      isCaller = true;
    })
    .catch((err) => {
      console.log("ERROR : Occure in create" + err);
    });
});

socket.on("joined", (room) => {
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = stream;
      socket.emit("ready", roomNumber);
    })
    .catch((err) => {
      console.log("ERROR : Occure in joined" + err);
    });
});

socket.on("ready", (room) => {
  if (isCaller) {
    rtcPeerConnect = new RTCPeerConnection(iceServers);
    rtcPeerConnect.onicecandidate = onIceCandidate;
    rtcPeerConnect.ontrack = onAddStream;
    rtcPeerConnect.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnect.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnect
      .createOffer()
      .then((sessionDescription) => {
        rtcPeerConnect.setLocalDescription(sessionDescription);
        socket.emit("offer", {
          type: "offer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

socket.on("offer", (event) => {
  if (!isCaller) {
    rtcPeerConnect = new RTCPeerConnection(iceServers);
    rtcPeerConnect.onicecandidate = onIceCandidate;
    rtcPeerConnect.ontrack = onAddStream;
    rtcPeerConnect.addTrack(localStream.getTracks()[0], localStream);
    rtcPeerConnect.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnect.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnect
      .createAnswer()
      .then((sessionDescription) => {
        rtcPeerConnect.setLocalDescription(sessionDescription);
        socket.emit("answer", {
          type: "answer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

socket.on("answer", (event) => {
  rtcPeerConnect.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("candidate", (event) => {
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnect.addIceCandidate(candidate);
});

function onAddStream(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending the ice candidate", event.candidate);
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomNumber,
    });
  }
}
