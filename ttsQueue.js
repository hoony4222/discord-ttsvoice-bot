const fs = require("fs");
const crypto = require("crypto");
const edgeTTS = require("edge-tts");
const { createAudioResource } = require("@discordjs/voice");

let queue = [];
let playing = false;

function getCacheFile(text){
 const hash = crypto.createHash("md5").update(text).digest("hex");
 return `cache/${hash}.mp3`;
}

async function generateTTS(text, voice, rate, pitch, file){

 const communicate = new edgeTTS.Communicate(text, voice, {
  rate: rate,
  pitch: pitch
 });

 const stream = await communicate.stream();

 const writeStream = fs.createWriteStream(file);

 for await (const chunk of stream){
  if(chunk.type === "audio"){
   writeStream.write(chunk.data);
  }
 }

 writeStream.end();
}

async function play(player,item){

 const file = getCacheFile(item.text);

 if(!fs.existsSync("cache")){
  fs.mkdirSync("cache");
 }

 if(!fs.existsSync(file)){
  await generateTTS(
   item.text,
   item.voice,
   item.rate,
   item.pitch,
   file
  );
 }

 const resource = createAudioResource(file);
 player.play(resource);

}

async function process(player){

 if(playing || queue.length === 0) return;

 playing = true;

 const item = queue.shift();

 await play(player,item);

 player.once("idle",()=>{
  playing = false;
  process(player);
 });

}

function add(player,data){
 queue.push(data);
 process(player);
}

module.exports = { add };