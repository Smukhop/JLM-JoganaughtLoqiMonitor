/* Walks the four surfaces — loader, landing, clearance gate, studio — and
   captures each one. Not a gate; a visual diff aid. `npm run shots`. */
import { chromium } from 'playwright';
const b = await chromium.launch({ ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}), args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const p = await b.newPage({ viewport:{width:1600,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await p.goto('http://127.0.0.1:4200/',{waitUntil:'domcontentloaded'});
// boot with engine up behind it
await p.waitForFunction(()=>document.documentElement.getAttribute('data-engine')==='up',null,{timeout:120000}).catch(()=>{});
await p.screenshot({path:'tests/shots/S1-boot.png'});
await p.waitForFunction(()=>{const b=document.getElementById('boot');return b&&b.classList.contains('done');},null,{timeout:120000}).catch(()=>{});
await p.waitForTimeout(3500);
await p.mouse.move(980,470); await p.waitForTimeout(1500);
await p.screenshot({path:'tests/shots/S2-landing.png'});
// auth
await p.click('#authChip');
await p.waitForTimeout(2600);
await p.screenshot({path:'tests/shots/S3-auth.png'});
// sign in -> studio
await p.click('#demoRow .chipx');
await p.waitForTimeout(400);
await p.click('#authSubmit');
await p.waitForTimeout(4500);
await p.screenshot({path:'tests/shots/S4-studio.png'});
console.log('errors:', errs.length?errs.slice(0,5).join(' | '):'none');
await b.close();
