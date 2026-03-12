const {Client,GatewayIntentBits}=require("discord.js");
const {joinVoiceChannel,createAudioPlayer}=require("@discordjs/voice");

const config=require("./config");
const filter=require("./messageFilter");
const abbrManager=require("./abbreviationManager");
const voiceManager=require("./voiceManager");
const ttsQueue=require("./ttsQueue");

const client=new Client({
 intents:[
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates
 ]
});

let connection;
const player=createAudioPlayer();
let abbreviations=abbrManager.load();
let roleVoices=voiceManager.load();

client.once("ready",()=>{
 console.log("TTS Bot Ready");
});

client.on("messageCreate",async message=>{
 if(message.author.bot) return;
 if(message.content==="!join"){
  const channel=message.member.voice.channel;
  if(!channel) return message.reply("음성채널에 들어가 주세요");
  connection=joinVoiceChannel({
   channelId:channel.id,
   guildId:channel.guild.id,
   adapterCreator:channel.guild.voiceAdapterCreator
  });
  connection.subscribe(player);
  return;
 }

 if(message.content==="!leave"){
  if(connection) connection.destroy();
  connection=null;
  return;
 }

 if(message.content.startsWith("!목소리")){
  const args=message.content.split(" ");
  const role=message.mentions.roles.first();
  if(!role) return;
  roleVoices[role.id]={
   voice:args[2],
   rate:args[3],
   pitch:args[4]
  };

  voiceManager.save(roleVoices);
  message.reply("설정 완료");
  return;
 }

 if(message.content.startsWith("!줄임말")){
  const args=message.content.split(" ");
  const key=args[1];
  const value=args.slice(2).join(" ");
  abbreviations[key]=value;
  abbrManager.save(abbreviations);
  message.reply("줄임말 등록");
  return;
 }

 if(!connection) return;
 let text=message.content;
 text=filter(text);
 text=abbrManager.apply(text,abbreviations);
 if(text.length>config.MAX_MESSAGE_LENGTH) return;
 const voice=voiceManager.getVoice(message.member,roleVoices);
 ttsQueue.add(player,{
  text,
  voice:voice.voice,
  rate:voice.rate,
  pitch:voice.pitch
 });
});


client.login(token);
