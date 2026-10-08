import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.md':'text/plain; charset=utf-8','.woff2':'font/woff2','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{try{const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}}).listen(3011,'127.0.0.1',()=>console.log('Mockups: http://localhost:3011'));
