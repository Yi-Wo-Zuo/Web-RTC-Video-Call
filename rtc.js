const containerEl = document.querySelector(".container");
const callBtn = document.querySelector(".call");
const modelEl = document.querySelector(".model");
const closeEl = document.querySelector("#close");
const connectionEl = document.querySelector("#connection");
const textEl = document.querySelector(".text");
const avatarEl = document.querySelector(".avatar");
const videoBox = document.querySelector(".videoBox");

const userId = Math.random(32).toString().substring(2);

var socket = null;

// 创建Web Socket
function createWebSocket() {
  socket = new WebSocket("ws://192.168.0.106:3000");

  socket.onopen = function () {
    console.log("建立Web Socket链接");
    // 服务端存储用户信息
    socket.send(JSON.stringify({ cmd: "login", userId: userId }));
  };
  socket.onmessage = function (e) {
    const message = JSON.parse(e.data);

    switch (message.cmd) {
      case "call":
        incomingCall(message);
        break;
      case "end":
        hangUp(message);
        break;
      case "offer":
        createAnswer(message);
        break;
      case "answer":
        protocolEnd(message);
        break;
      case "connection":
        connection(message);
        break;
      case "candidate":
        candidate(message);
        break;
      case "error":
        handlerError(message);
        break;
    }
  };
  socket.onerror = function (e) {
    alert("WebSocket链接失败，请刷新后重试或查看服务是否开启。");
  };
}

// 来电消息
function incomingCall(message) {
  modelEl.style.display = "block";
  connectionEl.style.display = "block";
}
// 对方挂断
function hangUp(message) {
  modelEl.style.display = "none";
  handlerClose();
}

/**
 *
 * 处理rtc相关的任务
 *
 *
 */

var rtc = null;
var localStream = null;
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");

// 获取用户摄像头
async function getUserMedia() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
  console.log(stream);
  localVideo.srcObject = stream;
  localStream = stream;
  // 初始化Web RTC
  createRTCPeerConnection();
}

// 创建Web RTC
function createRTCPeerConnection() {
  rtc = new RTCPeerConnection();

  rtc.addEventListener("icecandidate", (event) => {
    // 发送candidate
    socket.send(
      JSON.stringify({ cmd: "candidate", candidate: event.candidate, userId })
    );
    console.log(event);
  });

  localStream.getTracks().forEach((track) => rtc.addTrack(track, localStream));

  rtc.addEventListener("track", (event) => {
    remoteVideo.srcObject = event.streams[0];
    console.log(event);
  });
}

/**
 * 协议
 */

// 获取offer设置本地并发送给服务端
async function createOffer() {
  const session = await rtc.createOffer();

  await rtc.setLocalDescription(session);

  socket.send(JSON.stringify({ cmd: "offer", content: session, userId }));
}

// 从服务端获取offer,设置远端,获取answer设置本地并发送给服务端
async function createAnswer(message) {
  await rtc.setRemoteDescription(message.content);

  const session = await rtc.createAnswer();

  await rtc.setLocalDescription(session);

  socket.send(JSON.stringify({ cmd: "answer", content: session, userId }));
}

// 获取answer设置远端
async function protocolEnd(message) {
  rtc.setRemoteDescription(message.content);
}

// 接听电话,显示视频
async function connection() {
  videoBox.style.display = "block";
  textEl.style.display = "none";
  localVideo.style.display = "none";
  avatarEl.style.display = "none";
  await getUserMedia();
  await createOffer();
}

// 设置candidate
function candidate(message) {
  rtc.addIceCandidate(message.candidate);
}

// 处理错误
function handlerError(message) {
  alert(message.message);
  if (message.message === "远端人员未在线") {
    modelEl.style.display = "none";
  } else {
    document.body.innerHTML = `<h1>${message.message}</h1>`;
  }
}

// 关闭视频流
function handlerClose() {
  videoBox.style.display = "none";
  avatarEl.style.display = "block";
  textEl.style.display = "block";

  remoteVideo.srcObject = null;

  // 关闭本地流
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  // 关闭rtc
  if (rtc) {
    rtc.close();
    rtc = null;
  }
}

window.addEventListener("load", () => {
  // 创建WebSocket链接
  createWebSocket();
  // 点击视频通话按钮
  callBtn.addEventListener("click", async (e) => {
    modelEl.style.display = "block";
    // 发送打电话命令
    socket.send(JSON.stringify({ cmd: "call", userId: userId }));
  });
  // 点击挂断
  closeEl.addEventListener("click", () => {
    modelEl.style.display = "none";
    handlerClose();
    // 发送挂断电话命令
    socket.send(JSON.stringify({ cmd: "end", userId: userId }));
  });
  // 点击接听
  connectionEl.addEventListener("click", async () => {
    // 获取摄像头
    await getUserMedia();
    videoBox.style.display = "block";
    connectionEl.style.display = "none";
    textEl.style.display = "none";
    localVideo.style.display = "none";
    avatarEl.style.display = "none";
    socket.send(JSON.stringify({ cmd: "connection", userId }));
  });
});

window.addEventListener("beforeunload", () => {
  socket.send(JSON.stringify({ cmd: "close", userId }));
  socket.close();
});
