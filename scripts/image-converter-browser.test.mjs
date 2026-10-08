// Start the app with npm run dev, then run npm run test:image-converter-browser.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(process.cwd() + '/package.json');
const sharp = require('sharp');
const ExifReader = require('exifreader');
const { unzipSync } = require('fflate');
const { chromium } = require('playwright');
const xml = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:rights>Browser Test</dc:rights></rdf:Description></rdf:RDF></x:xmpmeta>';
const source = await sharp({create:{width:80,height:40,channels:3,background:'#f97316'}}).withMetadata({orientation:6}).withExifMerge({IFD0:{Make:'Browser Camera'},IFD3:{GPSLatitudeRef:'N',GPSLatitude:'13/1 45/1 0/1'}}).withXmp(xml).jpeg().toBuffer();
const executablePath = process.env.CHROMIUM_EXECUTABLE || (await fs.access('/usr/bin/google-chrome').then(() => '/usr/bin/google-chrome', () => undefined));
const baseUrl = process.env.IMAGE_CONVERTER_TEST_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
page.setDefaultTimeout(20000);
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
const uploaded=[]; page.on('request',r=>{if(r.method()==='POST' && !r.url().includes('/__nextjs')) uploaded.push(r.url());});
try {
 await page.goto(`${baseUrl}/en/tools/image-converter/`,{waitUntil:'networkidle'});
 await page.locator('input[type=file]').setInputFiles([{name:'camera.jpg',mimeType:'image/jpeg',buffer:source},{name:'camera-second.jpg',mimeType:'image/jpeg',buffer:source}]);
 const toggle=page.getByRole('switch',{name:'Remove metadata'});
 assert.equal(await toggle.isChecked(),true);
 if(process.env.IMAGE_CONVERTER_SCREENSHOTS) await page.screenshot({path:`${process.env.IMAGE_CONVERTER_SCREENSHOTS}/image-converter-desktop.png`,fullPage:true});
 for(const format of ['JPG','PNG','WebP','AVIF']) for(const remove of [true,false]) {
   await toggle.setChecked(remove);
   await page.getByRole('button',{name:format,exact:true}).click();
   const convert=page.getByRole('button',{name:'Convert All (2 files)',exact:true});
   console.log('Starting',format,remove);
   await convert.click();
   assert.equal(await toggle.isDisabled(),true);
   await page.getByRole('button',{name:'Download All (ZIP)',exact:true}).waitFor({timeout:30000}).catch(async e=>{console.log((await page.locator('main').innerText()).slice(0,2800));throw e;});
   assert.equal(await toggle.isDisabled(),false);
   const promise=page.waitForEvent('download');
   await page.getByRole('button',{name:'Download All (ZIP)',exact:true}).click();
   const download=await promise;
   const zipped=unzipSync(await fs.readFile(await download.path()));
   assert.equal(Object.keys(zipped).length,2);
   for(const data of Object.values(zipped)) {
     const tags=ExifReader.load(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),{expanded:true});
     if(remove){assert.equal(tags.exif,undefined);assert.equal(tags.xmp,undefined);}
     else {assert.equal(tags.exif.Make.description,'Browser Camera');assert.equal(tags.gps.Latitude,13.75);assert.equal(tags.xmp.rights.description,'Browser Test');assert.equal(tags.exif.Orientation.value,1);}
     const metadata=await sharp(Buffer.from(data)).metadata();assert.equal(metadata.width,40);assert.equal(metadata.height,80);
   }
   console.log(format, remove?'remove':'keep', 'two files and ZIP verified');
 }
 await page.getByRole('button',{name:'Clear All',exact:true}).click();
 const damaged = Buffer.from(source);
 damaged[damaged.indexOf(Buffer.from('Exif\0\0')) + 6] = 0;
 await page.locator('input[type=file]').setInputFiles({name:'damaged.jpg',mimeType:'image/jpeg',buffer:damaged});
 await page.getByRole('button',{name:'JPG',exact:true}).click();
 await page.getByRole('button',{name:'Convert All (1 files)',exact:true}).click();
 await page.getByText('Some metadata could not be preserved',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Download',exact:true}).waitFor();
 console.log('Damaged metadata warns without blocking conversion');
 await page.setViewportSize({width:390,height:844});
 await toggle.evaluate(e => window.scrollTo({top:window.scrollY + e.getBoundingClientRect().top - 200,behavior:'instant'}));
 if(process.env.IMAGE_CONVERTER_SCREENSHOTS) await page.screenshot({path:`${process.env.IMAGE_CONVERTER_SCREENSHOTS}/image-converter-mobile.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.goto(`${baseUrl}/th/tools/image-converter/`,{waitUntil:'networkidle'});
 await page.locator('input[type=file]').setInputFiles({name:'camera.jpg',mimeType:'image/jpeg',buffer:source});
 await page.getByRole('switch',{name:'ลบ Metadata'}).waitFor();
 await page.getByRole('switch',{name:'ลบ Metadata'}).focus();
 await page.keyboard.press('Space');
 assert.equal(await page.getByRole('switch',{name:'ลบ Metadata'}).isChecked(),false);
 const info=page.getByRole('heading',{name:'การลบและเก็บ Metadata'});
 const faq=page.getByRole('heading',{name:'คำถามที่พบบ่อย'});
 assert.ok((await info.boundingBox()).y < (await faq.boundingBox()).y);
 assert.deepEqual(errors,[]);assert.deepEqual(uploaded,[]);
 console.log('Thai/English, mobile width, metadata section location and local processing verified');
} finally { await browser.close(); }
