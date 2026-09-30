const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT) || 4173;
http.createServer((req,res)=>{
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
  res.end(fs.readFileSync(path.join(__dirname,'../dist/index.html')));
}).listen(port,'0.0.0.0',()=>console.log(`Midnight Vault ready on port ${port}`));
