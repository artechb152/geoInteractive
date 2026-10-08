import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!/^[a-zA-Z0-9_.-]+$/.test(name)||!types[path.extname(name)]){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(root,name),(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-cache'});res.end(data);});
}).listen(4316,'127.0.0.1',()=>process.stdout.write('Mockup gallery: http://127.0.0.1:4316/\n'));

