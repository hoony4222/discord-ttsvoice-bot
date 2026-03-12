const fs = require("fs");
const FILE="roleVoices.json";

function load(){
 if(!fs.existsSync(FILE)) return {};
 return JSON.parse(fs.readFileSync(FILE));
}

function save(data){
 fs.writeFileSync(FILE,JSON.stringify(data,null,2));
}

function getVoice(member,roles){
 for(const role of member.roles.cache.values()){
  if(roles[role.id]) return roles[role.id];

 }

 return{
  voice:"ko-KR-SunHiNeural",
  rate:"+0%",
  pitch:"+0%"
 };
}

module.exports={load,save,getVoice};