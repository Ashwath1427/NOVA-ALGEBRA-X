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

test('linear equations with arbitrary variables other than x', () => {
 assert.equal(format(solve('3y - 4 = 11').solution), '5');
 assert.equal(solve('3y - 4 = 11').variable, 'y');
 assert.equal(format(solve('5n + 10 = 2n + 25').solution), '5');
 assert.equal(solve('5n + 10 = 2n + 25').variable, 'n');
 assert.equal(format(solve('4(t - 3) = 2(t + 5)').solution), '11');
 assert.equal(solve('4(t - 3) = 2(t + 5)').variable, 't');
 assert.equal(format(solve('2a + 5 = 13').solution), '4');
 assert.equal(solve('2a + 5 = 13').variable, 'a');
 assert.equal(format(solve('-3z + 6 = 12').solution), '-2');
 assert.equal(solve('-3z + 6 = 12').variable, 'z');
 assert.equal(format(solve('2', '5', '13', 'y').solution), '4');
 assert.equal(solve('2', '5', '13', 'y').variable, 'y');
 assert.equal(solve('0z + 5 = 5').type, 'infinite');
 assert.equal(solve('0w + 2 = 8').type, 'none');
 assert.equal(solve('2y + 4 = 2y + 4').type, 'infinite');
 assert.equal(solve('2y + 4 = 2y + 7').type, 'none');
});

test('quadratic equations and non-x variables', () => {
 const q1 = solve('x^2 - 5x + 6 = 0');
 assert.equal(q1.type, 'quadratic_two_roots');
 assert.equal(format(q1.solutions[0]), '3');
 assert.equal(format(q1.solutions[1]), '2');

 const q2 = solve('y^2 = 16');
 assert.equal(q2.type, 'quadratic_two_roots');
 assert.equal(q2.variable, 'y');
 assert.equal(format(q2.solutions[0]), '4');
 assert.equal(format(q2.solutions[1]), '-4');

 const q3 = solve('2z^2 + 5z - 3 = 0');
 assert.equal(q3.type, 'quadratic_two_roots');
 assert.equal(q3.variable, 'z');
 assert.equal(format(q3.solutions[0]), '1/2');
 assert.equal(format(q3.solutions[1]), '-3');

 const q4 = solve('w^2 + 1 = 0');
 assert.equal(q4.type, 'quadratic_complex');
 assert.equal(q4.variable, 'w');
});

test('expression simplification and natural language algebra queries', () => {
 const exp1 = solve('3x + 2x - 5 + 8');
 assert.equal(exp1.type, 'expression');
 assert.equal(exp1.simplified, '5x + 3');

 const exp2 = solve('(x + 2)(x + 3)');
 assert.equal(exp2.type, 'expression');
 assert.equal(exp2.simplified, 'x² + 5x + 6');

 const nat1 = solve('Solve for y: 4y - 12 = 0');
 assert.equal(format(nat1.solution), '3');
 assert.equal(nat1.variable, 'y');

 const nat2 = solve('What is the difference between an equation and an expression?');
 assert.equal(nat2.type, 'ai_question');
 assert.equal(nat2.isQuestion, true);
});


