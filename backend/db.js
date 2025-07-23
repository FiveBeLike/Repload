const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('repload.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, login TEXT UNIQUE, password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS channels(
    id INTEGER PRIMARY KEY, name TEXT, nick TEXT UNIQUE, avatar TEXT, description TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages(
    id TEXT PRIMARY KEY, ch_id INTEGER, login TEXT, content TEXT, timestamp INTEGER
  )`);
});

module.exports = {
  register: (login,pwd)=> new Promise(res=> {
    db.run(`INSERT INTO users(login,password) VALUES(?,?)`, [login,pwd], err=> res({success:!err, message:err?.message}));
  }),
  auth: (login,pwd)=> new Promise(res=> {
    db.get(`SELECT login FROM users WHERE login=? AND password=?`, [login,pwd], (e,row)=>
      res({success:!!row})
    );
  }),
  addMsg: (id,ch,login,content,ts)=> new Promise(res=>{
    db.run(`INSERT INTO messages VALUES(?,?,?,?,?)`, [id,ch,login,content,ts], err=> res());
  }),
  editMsg: (id,login,newc)=> new Promise(res=>{
    db.run(`UPDATE messages SET content=? WHERE id=? AND login=?`, [newc,id,login], function(err){
      res({success:!err && this.changes});
    });
  }),
  delMsg: (id,login,forAll)=> new Promise(res=>{
    if(forAll) db.run(`DELETE FROM messages WHERE id=? AND login=?`, [id,login], function(err){
      res({success:!err && this.changes});
    });
    else db.run(`UPDATE messages SET content='Сообщение удалено' WHERE id=? AND login=?`, [id,login], err=> res({success:!err}));
  }),
  createChannel: (name,nick)=> new Promise(res=>{
    db.run(`INSERT INTO channels(name,nick) VALUES(?,?)`, [name,nick], err=> res({success:!err}));
  }),
  updateChannel: (id,cols,vals)=> new Promise(res=>{
    const sql = `UPDATE channels SET ${cols.map(c=>`${c}=?`).join(',')} WHERE id=?`;
    db.run(sql, [...vals,id], err=> res({success:!err}));
  }),
  getMsgs: (ch)=> new Promise(res=>{
    db.all(`SELECT * FROM messages WHERE ch_id=? ORDER BY timestamp`, [ch], (e,rows)=> res(rows));
  }),
  listChannels: ()=> new Promise(res=>{
    db.all(`SELECT * FROM channels`, [], (e,rows)=> res(rows));
  })
};
 