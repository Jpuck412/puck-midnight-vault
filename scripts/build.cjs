const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
let html = fs.readFileSync(path.join(root,'src/index.html'),'utf8');
for (const [token,file,tag] of [['STYLES','style.css','style'],['ENGINE','engine.js','script'],['APP','app.js','script']]) {
  const contents = fs.readFileSync(path.join(root,'src',file),'utf8');
  html = html.replace(`<!-- ${token} -->`, `<${tag}>\n${contents}\n</${tag}>`);
}
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/index.html'),html);
console.log('Built dist/index.html — complete offline game, no external dependencies.');
