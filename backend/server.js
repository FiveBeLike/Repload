const express = require('express');
const body = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const db = require('./db');
const { v4: uuid } = require('uuid');

const app = express();
app.use(body.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const sockets = {};

wss.on('connection', ws => {
  ws.on('message', async m => {
    const d = JSON.parse(m);
    const { type, msgId, channel, login, content, forAll, chId, nick, avatar, description, name } = d;
    if (type === 'login') { sockets[login] = ws; }
    if (type === 'createChannel') {
      const out = await db.createChannel(name, nick);
      broadcast({ type: 'channelList', list: await db.listChannels() });
    }
    if (type === 'updateChannel') {
      await db.updateChannel(chId, ['name','nick','avatar','description'], [name,nick,avatar,description]);
      broadcast({ type: 'channelList', list: await db.listChannels() });
    }
    if (type === 'fetchMsgs') {
      const msgs = await db.getMsgs(channel);
      ws.send(JSON.stringify({ type:'msgHistory', msgs }));
    }
    if (type === 'msg') {
      const id = uuid(), ts = Date.now();
      await db.addMsg(id, channel, login, content, ts);
      broadcast({ type:'msg', id, channel, login, content, ts });
    }
    if (type === 'editMsg') {
      const ok = await db.editMsg(msgId, login, content);
      if (ok.success) broadcast({ type:'editMsg', msgId, content });
    }
    if (type === 'delMsg') {
      const ok = await db.delMsg(msgId, login, forAll);
      if (ok.success) broadcast({ type:'delMsg', msgId, forAll });
    }
  });
  ws.on('close', () => {
    for (let l in sockets) if (sockets[l] === ws) delete sockets[l];
  });
});

function broadcast(data){
  Object.values(sockets).forEach(ws => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)));
}

app.post('/register', async (req, res) => res.json(await db.register(req.body.login, req.body.password)));
app.post('/login', async (req, res) => res.json(await db.auth(req.body.login, req.body.password)));
app.listen(process.env.PORT || 3000, ()=> console.log('Repload backend listening'));
server.listen(+(process.env.WS_PORT || process.env.PORT || 3000)+1);
