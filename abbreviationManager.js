const fs = require("fs");

const FILE = "abbreviations.json";

function load(){

 if(!fs.existsSync(FILE)){
  fs.writeFileSync(FILE,"{}");
 }

 return JSON.parse(fs.readFileSync(FILE));

}

function save(data){

 fs.writeFileSync(FILE,JSON.stringify(data,null,2));

}

function apply(text,data){

 for(const key in data){

  text = text.replaceAll(key,data[key]);

 }

 return text;

}

module.exports = {load,save,apply};