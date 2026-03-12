const googleTTS = require("google-tts-api");
const fetch = require("node-fetch");
const fs = require("fs");
const crypto = require("crypto");
const {createAudioResource} = require("@discordjs/voice");

let queue = [];
let playing = false;

function getCacheFile(text){

 const hash = crypto.createHash("md5")
  .update(text)
  .digest("hex");

 return `cache/${hash}.mp3`;
}

async function generateTTS(text,lang,file){

 const url = googleTTS.getAudioUrl(text,{
  lang:lang,
  slow:false
 });

 const res = await fetch(url);
 const buffer = await res.buffer();

 fs.writeFileSync(file,buffer);

}

async function play(player,item){

 if(!fs.existsSync("cache")){
  fs.mkdirSync("cache");
 }

 const file = getCacheFile(item.text);

 if(!fs.existsSync(file)){
  await generateTTS(item.text,item.lang,file);
 }

 const resource = createAudioResource(file);
 player.play(resource);

}

async function process(player){

 if(playing || queue.length===0) return;

 playing = true;

 const item = queue.shift();

 await play(player,item);

 player.once("idle",()=>{
  playing=false;
  process(player);
 });

}

function add(player,data){

 queue.push(data);
 process(player);

}

module.exports = {add};