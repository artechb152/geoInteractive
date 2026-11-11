import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out='design/screenshots/topic06-onboarding-video';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/idog2/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1122}});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://localhost:3086/lessons/topic-06/#scene-onboarding',{waitUntil:'networkidle',timeout:240000});
 const section=page.locator('#scene-onboarding');await section.waitFor({timeout:60000});
 const canvas=section.locator('canvas');await canvas.waitFor();
 await page.waitForTimeout(2500);
 const phases=['תכנון: בחירת המסלול','יציאה: קביעת כיוון','בתנועה: בדיקת המיקום','הגעה: אימות היעד'];
 const hashes=[];
 for(let i=0;i<phases.length;i++){
  const button=section.getByRole('button',{name:phases[i]});
  if(i)await button.click();await page.waitForTimeout(1800);
  hashes.push(await canvas.evaluate(c=>c.toDataURL()));
  await page.screenshot({path:`${out}/0${i+1}.png`});
 }
 await section.getByRole('button',{name:phases[0]}).click();await page.waitForTimeout(2200);
 const back=await canvas.evaluate(c=>c.toDataURL());
 if(back!==hashes[0])throw Error('Reverse playback did not return to planning frame');
 await section.getByRole('button',{name:phases[2]}).click();
 await page.waitForTimeout(100);await section.getByRole('button',{name:phases[1]}).click();
 await page.waitForTimeout(2400);
 if(await canvas.evaluate(c=>c.toDataURL())!==hashes[1])throw Error('Interrupted navigation did not reach latest target');
 if(new Set(hashes).size!==4)throw Error('Some phase images are identical');
 await page.emulateMedia({reducedMotion:'reduce'});
 await section.getByRole('button',{name:phases[3]}).click();await page.waitForTimeout(600);
 if(await canvas.evaluate(c=>c.toDataURL())!==hashes[3])throw Error('Reduced motion did not reach arrival');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: four phases, reverse, interruption, reduced motion; no page errors');
}finally{await browser.close();}
