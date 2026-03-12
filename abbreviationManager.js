const fs = require("fs");
const FILE="abbreviations.json";

function load(){
 if(!fs.existsSync(FILE)) return {};
 return JSON.parse(fs.readFileSync(FILE));
}

function save(data){
 fs.writeFileSync(FILE,JSON.stringify(data,null,2));
}

function apply(text,dict){
 for(const key in dict){
  const regex=new RegExp(key,"g");
  text=text.replace(regex,dict[key]);
 }
 return text;
}

module.exports={load,save,apply};