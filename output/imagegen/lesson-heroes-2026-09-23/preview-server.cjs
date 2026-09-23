const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=__dirname;
http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
let file=pathname==='/lesson-heroes-04-12.zip'?path.join(root,'..','lesson-heroes-04-12.zip'):path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
if(pathname!=='/lesson-heroes-04-12.zip'&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
fs.stat(file,(e,s)=>{if(e||!s.isFile()){res.writeHead(404).end();return}const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.zip':'application/zip'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':s.size});fs.createReadStream(file).pipe(res)})}).listen(4319,'127.0.0.1',()=>console.log('Preview ready: http://127.0.0.1:4319'));

