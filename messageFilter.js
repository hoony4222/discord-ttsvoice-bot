module.exports = function(text){

 text = text.replace(/https?:\/\/\S+/g,"링크");
 text = text.replace(/<@!?\d+>/g,"");

 return text;

};