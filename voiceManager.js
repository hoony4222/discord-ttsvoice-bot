const fs = require("fs");

const FILE = "roleVoices.json";

function load(){

 if(!fs.existsSync(FILE)){
  fs.writeFileSync(FILE,"{}");
 }

 return JSON.parse(fs.readFileSync(FILE));

}

function save(data){

 fs.writeFileSync(FILE,JSON.stringify(data,null,2));

}

function getVoice(member,data){

 for(const role of member.roles.cache.values()){

  if(data[role.id]){
   return data[role.id];
  }

 }

 return {lang:"ko"};

}

module.exports = {load,save,getVoice};