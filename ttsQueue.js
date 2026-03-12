const {spawn} = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const {createAudioResource} = require("@discordjs/voice");

let queue = [];
let playing = false;

function getCacheFile(text, voice, rate, pitch){
 const hash = crypto
  .createHash("md5")
  .update(text + voice + rate + pitch)
  .digest("hex");

 return `cache/${hash}.mp3`;
}

function generateTTS(text, voice, rate, pitch, file){

 return new Promise((resolve, reject)=>{

  const tts = spawn("edge-tts",[
   "--voice", voice,
   "--rate", rate,
   "--pitch", pitch,
   "--text", text,
   "--write-media", file
  ]);

  tts.on("close",()=>resolve());

  tts.on("error",(err)=>{
   console.error("TTS ERROR:",err);
   reject(err);
  });

 });

}

async function play(player,item){

 const file = getCacheFile(
  item.text,
  item.voice,
  item.rate,
  item.pitch
 );

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

 if(playing || queue.length===0) return;

 playing = true;

 const item = queue.shift();

 try{
  await play(player,item);
 }catch(err){
  console.error("Play error:",err);
 }

 player.once("idle",()=>{
  playing=false;
  process(player);
 });

}

function add(player,data){
 queue.push(data);
 process(player);
}

module.exports={add};