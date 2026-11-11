const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const input = 'C:/Users/idog2/Downloads/Navigator_walking_orange_route_t…_b9d51d6e.mp4';
const output = __dirname;
const stat = fs.statSync(input);
const server = http.createServer((req, res) => {
  if (req.url === '/video.mp4') {
    const range = req.headers.range;
    if (range) {
      const [a,b] = range.replace('bytes=','').split('-');
      const start = Number(a), end = b ? Number(b) : stat.size - 1;
      res.writeHead(206, {'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});
      fs.createReadStream(input,{start,end}).pipe(res);
    } else {
      res.writeHead(200, {'Content-Type':'video/mp4','Content-Length':stat.size,'Accept-Ranges':'bytes'});
      fs.createReadStream(input).pipe(res);
    }
  } else {
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end('<!doctype html><video id="video" muted preload="auto" src="/video.mp4"></video>');
  }
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,executablePath:'C:/Users/idog2/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const metadata = await page.evaluate(async()=>{
      const v=document.querySelector('video');
      if(v.readyState<2) await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(new Error(v.error?.message||'Video decoding failed'));});
      return {width:v.videoWidth,height:v.videoHeight,duration:v.duration};
    });
    console.log(JSON.stringify(metadata));
    const requested = [0,.125,.25,.5,.75,1,1.25,1.5,1.75,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,Math.max(0,metadata.duration-.05)];
    const times=[...new Set(requested.filter(t=>t<metadata.duration).map(t=>Math.round(t*1000)/1000))];
    const records=[];
    for(const time of times){
      const data=await page.evaluate(async(time)=>{
        const v=document.querySelector('video');
        if(Math.abs(v.currentTime-time)>.0001) await new Promise((resolve,reject)=>{v.onseeked=resolve;v.onerror=reject;v.currentTime=time;});
        const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
        return c.toDataURL('image/png').split(',')[1];
      },time);
      const name=`frame-${String(Math.round(time*1000)).padStart(5,'0')}.png`;
      fs.writeFileSync(path.join(output,name),Buffer.from(data,'base64'));
      records.push({time,file:name});
    }
    fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify({...metadata,input,frames:records},null,2));
    console.log('Extracted '+records.length+' frames.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
