const API_BASE = 'https://repload-backend.onrender.com';
let ws, login;
let curChannel = null;

async function doReg(){
  const res = await fetch(`${API_BASE}/register`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({login:LI().log,pwd:LI().pwd})});
  alert((await res.json()).success?'OK':'ERR');
}

async function doLogin(){
  login = LI().log;
  const res = await fetch(`${API_BASE}/login`,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({login, password:LI().pwd})});
  if (!(await res.json()).success) return alert('ERR');
  document.getElementById('login').style.display='none';
  document.getElementById('main').style.display='flex';
  ws = new WebSocket('wss://repload-backend.onrender.com');
  ws.onopen = ()=> ws.send(JSON.stringify({type:'login', login}));
  ws.onmessage = msg=>{
    const d = JSON.parse(msg.data);
    if (d.type === 'channelList') drawChannels(d.list);
    if (d.type === 'msgHistory') d.msgs.forEach(m=> addMsgEl(m));
    if (d.type === 'msg' && d.channel===curChannel) addMsgEl(d);
    if (d.type==='editMsg') document.querySelector(`[data-id="${d.msgId}"] .content`).textContent=d.content;
    if (d.type==='delMsg'){
      const el = document.querySelector(`[data-id="${d.msgId}"]`);
      if (d.forAll) el.querySelector('.content').textContent='(удалено)';
      else el.remove();
    }
  };
  ws.onopen = ()=> ws.send(JSON.stringify({type:'fetchChannels'}));
}

function LI(){ return {log:document.getElementById('loginIn').value, pwd:document.getElementById('pwdIn').value} }

function drawChannels(list){
  const ul = document.getElementById('channels'); ul.innerHTML='';
  list.forEach(ch=>{
    const li = document.createElement('li');
    li.textContent = ch.nick+' ('+ch.name+')';
    li.onclick = ()=>selectChannel(ch.id);
    ul.append(li);
  });
}

function selectChannel(id){
  curChannel = id;
  document.getElementById('messages').innerHTML='';
  ws.send(JSON.stringify({type:'fetchMsgs', channel:id}));
}

function addMsgEl(m){
  const el = document.createElement('div');
  el.className = 'msg' + (m.login === login ? ' self' : '');
  el.setAttribute('data-id', m.id);
  el.innerHTML = `<b>${m.login}</b>: <span class="content">${m.content}</span>`;
  if (m.login === login) {
    const edit = document.createElement('button'); edit.textContent='✎'; edit.onclick=()=>editMsg(m.id);
    const delAll = document.createElement('button'); delAll.textContent='🗑️'; delAll.onclick=()=>delMsg(m.id,true);
    const delSelf = document.createElement('button'); delSelf.textContent='❌'; delSelf.onclick=()=>delMsg(m.id,false);
    el.append(edit, delAll, delSelf);
  }
  document.getElementById('messages').append(el);
}

function sendMsg(){
  const c = document.getElementById('msgIn'); if (!c.value || !curChannel) return;
  ws.send(JSON.stringify({type:'msg', channel: curChannel, login, content:c.value}));
  c.value='';
}

function editMsg(id){
  const newc = prompt('Новое сообщение:');
  if(newc!==null) ws.send(JSON.stringify({type:'editMsg', msgId:id, content:newc}));
}

function delMsg(id, forAll){
  ws.send(JSON.stringify({type:'delMsg', msgId:id, forAll}));
}

function createCh(){
  const name = prompt('Имя канала'), nick = prompt('Адрес (ник)');
  ws.send(JSON.stringify({type:'createChannel', name, nick}));
}

function applyCh(){
  const name=document.getElementById('ch_name').value;
  const nick=document.getElementById('ch_nick').value;
  const avatar=document.getElementById('ch_avatar').value;
  const desc=document.getElementById('ch_desc').value;
  ws.send(JSON.stringify({type:'updateChannel', chId:curChannel, name,nick,avatar,description:desc}));
}
