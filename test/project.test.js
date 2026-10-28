import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, publicError } from '../server.js';
import { solve, arithmetic, format, parseNumber } from '../public/math.js';

async function withServer(options, run) {
 const server = createApp(options).listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 try { await run(`http://127.0.0.1:${server.address().port}`); }
 finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (base, body, extra = {}) => fetch(`${base}/api/algebra`, {method:'POST',headers:{'Content-Type':'application/json',...extra},body:typeof body === 'string' ? body : JSON.stringify(body)});

test('linear equations: exact, negative, fractional, decimal and zero coefficients', () => {
 assert.equal(format(solve('2','5','13').x),'4');
 assert.equal(format(solve('-2','6','12').x),'-3');
 assert.equal(format(solve('3','0','1').x),'1/3');
 assert.equal(format(solve('.1','.2','.3').x),'1');
 assert.equal(solve('0','5','5').type,'infinite');
 assert.equal(solve('0','2','8').type,'none');
 assert.equal(format(solve('1','0','0').x),'0');
 assert.equal(format(solve('1e-12','0','1').x),'1000000000000');
});
test('arithmetic is exact and rejects invalid inputs and zero division', () => {
 assert.equal(format(arithmetic('0.1','add','0.2')),'3/10');
 assert.equal(format(arithmetic('2','subtract','5')),'-3');
 assert.equal(format(arithmetic('-4','multiply','3')),'-12');
 assert.equal(format(arithmetic('1','divide','3')),'1/3');
 assert.throws(()=>arithmetic('2','divide','0'),/zero/);
 for (const input of ['', ' ', '1x', 'Infinity', 'NaN', '0x10', '1e99', '1e-20']) assert.throws(()=>parseNumber(input));
});
test('frontend, security headers, health and missing-key response', async () => withServer({apiKey:''},async base=>{
 const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/Nova Algebra X/);assert.match(page.headers.get('content-security-policy'),/script-src 'self'/);
 for(const resource of ['/app.js','/styles.css','/math.js'])assert.equal((await fetch(base+resource)).status,200);
 assert.equal((await (await fetch(base+'/api/health')).json()).aiConfigured,false);
 for(const resource of ['/.env','/server.js','/package.json'])assert.equal((await fetch(base+resource)).status,404);
 const response=await post(base,{message:'Solve 2x + 5 = 13'});assert.equal(response.status,503);assert.equal((await response.json()).code,'NOT_CONFIGURED');
}));
test('request validation, malformed JSON, request size and cross-origin rejection',async()=>withServer({apiKey:''},async base=>{
 for(const body of [{message:''},{message:'x'.repeat(1501)},{message:1},{message:'hi',history:[{role:'system',text:'bad'}]},null])assert.equal((await post(base,body)).status,400);
 assert.equal((await post(base,'{bad json')).status,400);
 assert.equal((await post(base,{message:'x'.repeat(14000)})).status,413);
 assert.equal((await post(base,{message:'hi'},{Origin:'https://example.com'})).status,403);
 assert.equal((await fetch(base+'/api/algebra',{method:'POST',body:'hello'})).status,415);
}));
test('successful tutor call preserves history and redacts key',async()=>{
 let received;await withServer({apiKey:'test-only-secret',generate:async contents=>{received=contents;return 'x = 4. test-only-secret';}},async base=>{
 const res=await post(base,{message:'Why?',history:[{role:'user',text:'Solve 2x+5=13'},{role:'model',text:'x=4'}]});assert.equal(res.status,200);assert.equal((await res.json()).reply,'x = 4. [redacted]');assert.equal(received.length,3);assert.equal(received[2].parts[0].text,'Why?');
 });
});
for(const [name,error,status,code] of [
 ['invalid key',{status:400,message:'API key not valid. secret'},502,'KEY_REJECTED'],
 ['permissions',{status:403,message:'secret'},502,'KEY_REJECTED'],
 ['quota',{status:429,message:'quota exhausted secret'},429,'QUOTA_OR_RATE_LIMIT'],
 ['model',{status:404,message:'secret'},502,'MODEL_UNAVAILABLE'],
 ['model overloaded',{status:503,message:'This model is currently experiencing high demand. secret'},503,'MODEL_OVERLOADED'],
 ['network',{message:'fetch failed secret'},503,'PROVIDER_UNAVAILABLE'],
 ['timeout',{name:'AbortError',message:'aborted secret'},504,'TIMEOUT'],
 ['deadline exceeded',{status:504,message:'Deadline expired before operation could complete. secret'},504,'TIMEOUT'],
 ['bad provider request',{status:400,message:'invalid request secret'},502,'PROVIDER_REQUEST']
])test(`provider error: ${name}`,async()=>withServer({apiKey:'test-only-secret',generate:async()=>{throw error;}},async base=>{const res=await post(base,{message:'solve x'});assert.equal(res.status,status);const body=await res.json();assert.equal(body.code,code);assert.ok(!JSON.stringify(body).includes('secret'));}));
test('empty provider output is a real error',async()=>withServer({apiKey:'test',generate:async()=>''},async base=>{const res=await post(base,{message:'solve x'});assert.equal(res.status,502);assert.equal((await res.json()).code,'EMPTY_REPLY');}));
test('local request limit protects API use',async()=>withServer({apiKey:'test',generate:async()=> 'x = 1',rateLimit:1},async base=>{assert.equal((await post(base,{message:'first'})).status,200);const res=await post(base,{message:'second'});assert.equal(res.status,429);assert.equal(res.headers.get('retry-after'),'60');}));
test('server diagnostics log categories and codes without leaking secrets', async () => {
 const originalError = console.error;
 const logged = [];
 console.error = (...args) => { logged.push(args.join(' ')); };
 try {
  await withServer({apiKey:'super-secret-key-12345',generate:async()=>{const err = new Error('Upstream failed with super-secret-key-12345'); err.status = 503; err.code = 'ETIMEDOUT'; throw err;}},async base=>{
   const res = await post(base, { message: 'solve 2x=4' });
   assert.equal(res.status, 503);
  });
  assert.ok(logged.some(msg => msg.includes('[Nova AI] Provider error: category=MODEL_OVERLOADED')));
  assert.ok(!logged.some(msg => msg.includes('super-secret-key-12345')));
 } finally {
  console.error = originalError;
 }
});
test('custom client api key header works when server has no key', async () => {
 await withServer({ apiKey: '' }, async base => {
  const resNoKey = await post(base, { message: 'solve 2x=6' });
  assert.equal(resNoKey.status, 503);
  let captured = false;
  await withServer({ apiKey: '', generate: async () => { captured = true; return 'x = 3. my-client-key'; } }, async baseWithMock => {
   const resCustom = await post(baseWithMock, { message: 'solve 2x=6' }, { 'x-gemini-api-key': 'my-client-key' });
   assert.equal(resCustom.status, 200);
   assert.equal(captured, true);
   const data = await resCustom.json();
   assert.equal(data.reply, 'x = 3. [redacted]');
  });
 });
});


