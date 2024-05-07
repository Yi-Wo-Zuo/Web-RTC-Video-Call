const ws = require("nodejs-websocket");
var userList = [];

// 获取远端user数据
function getRemoteUser(userId, conn) {
  const user = userList.filter((item) => item.userId !== userId);
  if (user.length) {
    return user[0];
  } else {
    conn.sendText(JSON.stringify({ cmd: "error", message: "远端人员未在线" }));
  }
}

// 存储用户信息
function login(message, conn) {
  if (userList.length == 2) {
    conn.sendText(
      JSON.stringify({ cmd: "error", message: "人数满2人，无法链接" })
    );
    return;
  }
  userList.push({ userId: message.userId, conn });
}

// 打电话命令
function call(message, conn) {
  const user = getRemoteUser(message.userId, conn);
  // 发送给对方提示接听电话
  user && user.conn.sendText(JSON.stringify({ cmd: "call" }));
}

// 挂断电话命令
function end(message, conn) {
  const user = getRemoteUser(message.userId, conn);
  // 发送给对方提示接听电话
  user && user.conn.sendText(JSON.stringify({ cmd: "end" }));
}

// 处理offer
function offer(message, conn) {
  const user = getRemoteUser(message.userId, conn);

  user &&
    user.conn.sendText(
      JSON.stringify({ cmd: "offer", content: message.content })
    );
}

// 处理anwser
function answer(message, conn) {
  const user = getRemoteUser(message.userId, conn);

  user &&
    user.conn.sendText(
      JSON.stringify({ cmd: "answer", content: message.content })
    );
}

// 对方接听电话
function connection(message, conn) {
  const user = getRemoteUser(message.userId, conn);

  user && user.conn.sendText(JSON.stringify({ cmd: "connection" }));
}

// 处理candidate
function candidate(message, conn) {
  const user = getRemoteUser(message.userId, conn);
  user &&
    user.conn.sendText(
      JSON.stringify({ cmd: "candidate", candidate: message.candidate })
    );
}

// 退出
function close(message, conn) {
  userList = userList.filter((item) => item.userId != message.userId);
}

const server = ws
  .createServer((conn) => {
    conn.on("text", (str) => {
      const message = JSON.parse(str);
      console.log(message);
      switch (message.cmd) {
        case "login":
          login(message, conn);
          break;
        case "call":
          call(message, conn);
          break;
        case "end":
          end(message, conn);
          break;
        case "offer":
          offer(message, conn);
          break;
        case "answer":
          answer(message, conn);
          break;
        case "connection":
          connection(message, conn);
          break;
        case "candidate":
          candidate(message, conn);
          break;
        case "close":
          close(message, conn);
          break;
      }
    });
  })
  .listen(3000);
