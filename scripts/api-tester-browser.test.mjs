// Start the app with npm run dev, or point API_TESTER_TEST_URL at the static export.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.env.API_TESTER_TEST_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_EXECUTABLE || (await fs.access('/usr/bin/google-chrome').then(() => '/usr/bin/google-chrome', () => undefined));
(async()=>{
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];const sent=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{if(!localStorage.getItem('lint-test-initialized')){localStorage.setItem('api-tester-direct-mode','true');localStorage.setItem('lint-test-initialized','true');}});
await page.route('https://example.test/**',route=>{sent.push({url:route.request().url(),method:route.request().method(),headers:route.request().headers(),body:route.request().postData()});return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
const fixture={info:{name:'Lint Fixture',schema:'postman/collection/v2.1'},item:[{name:'Create via Postman',request:{method:'POST',url:{raw:'https://example.test/request?limit=5',query:[{key:'limit',value:5}]},header:[{key:'X-Fixture',value:'yes'}],body:{mode:'raw',raw:'{"name":"Alice"}',options:{raw:{language:'json'}}},auth:{type:'bearer',bearer:[{key:'token',value:'fixture-token'}]}}}]};
try{
await page.goto(`${baseUrl}/en/tools/api-tester/`,{waitUntil:'networkidle'});
await page.locator('input[type=file]').setInputFiles({name:'collection.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
await page.getByText('Create via Postman',{exact:true}).click();
await page.waitForFunction(()=>Array.from(document.querySelectorAll('input[placeholder=Value]')).some(el=>el.value==='5'));
await page.getByPlaceholder('Value',{exact:true}).first().fill('7');
await page.waitForFunction(()=>Array.from(document.querySelectorAll('input')).some(el=>el.value.includes('limit=7')));
assert.match(await page.getByPlaceholder('https://api.example.com/endpoint or {{url}}/endpoint').inputValue(),/limit=7/);
const checkbox=page.locator('input[type=checkbox]').first();await checkbox.uncheck();assert.doesNotMatch(await page.getByPlaceholder('https://api.example.com/endpoint or {{url}}/endpoint').inputValue(),/limit=/);await checkbox.check();
await page.getByRole('button',{name:/^Headers/}).first().click();await page.getByPlaceholder('Value',{exact:true}).first().fill('edited');
await page.getByRole('button',{name:'Send Request',exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('api-tester-history')||'[]').length===1);
assert.equal(sent[0].method,'POST');assert.match(sent[0].url,/limit=7/);assert.equal(sent[0].headers.authorization,'Bearer fixture-token');assert.equal(sent[0].headers['x-fixture'],'edited');assert.equal(sent[0].body,'{"name":"Alice"}');
await page.getByRole('button',{name:/^Auth/}).first().click();await page.locator('select').filter({has:page.locator('option[value="bearer"]')}).selectOption('basic');await page.getByPlaceholder('Username',{exact:true}).fill('test-user');await page.getByPlaceholder('Password',{exact:true}).fill('test-pass');
await page.getByRole('button',{name:/^Body/}).first().click();await page.getByRole('button',{name:'x-www-form-urlencoded',exact:true}).click();await page.getByPlaceholder('Key',{exact:true}).first().fill('message');await page.getByPlaceholder('Value',{exact:true}).first().fill('hello world');
await page.getByRole('button',{name:'Send Request',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('api-tester-history')||'[]').length===2);
assert.equal(sent[1].headers.authorization,`Basic ${Buffer.from('test-user:test-pass').toString('base64')}`);assert.equal(sent[1].body,'message=hello+world');
await page.getByRole('button',{name:/Import from Code/}).click();await page.locator('textarea').first().fill('curl --location https://example.test/code -H "X-Code: imported"');await page.getByRole('button',{name:'Extract & Fill Form',exact:true}).click();
await page.getByRole('button',{name:'Send Request',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('api-tester-history')||'[]').length===3);assert.equal(sent[2].headers['x-code'],'imported');
await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({apiTesterBackupVersion:1,collections:[],requests:[{headers:[{value:{}}]}],environments:[]}))});
await page.getByText('Invalid file format. Expected Postman Collection (v2.1) or Postman Environment',{exact:true}).waitFor();
assert.deepEqual(errors,[]);console.log('API browser: Postman import, parameter string/boolean edits, headers, JSON/form bodies, bearer/basic auth, cURL extraction, mocked requests and invalid backup rejection passed');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
