const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(file, overrides = {}, globals = {}) {
  const filename = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith('@/lib/')) return load('src/lib/' + name.slice(6) + '.ts', overrides, globals);
    return require(name);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, process: { env: { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', RECAPTCHA_SECRET_KEY: 'fixture' } }, console: { error() {} }, AbortSignal, URLSearchParams, ...globals }, { filename });
  return module.exports;
}
const valid = () => ({ customer_name: 'Test Customer', phone: '+592 699 2175', email: 'test@example.com', address: 'Region 4, Georgetown', service_type: 'Garden Design & Planting', description: '', preferred_date: '2099-01-01', consent: true, whatsapp_confirmed: false });
async function invoke({ form = valid(), captcha = { success: true, score: .9, action: 'submit' }, limit = true, rpcError = null, rpcThrow = false } = {}) {
  let limits = 0, writes = 0;
  const { default: handler } = load('pages/api/verify-recaptcha.ts', {
    '@supabase/supabase-js': { createClient: () => ({ rpc: async () => { writes++; if (rpcThrow) throw Error('fixture'); return { data: rpcError ? null : 'pending-fixture', error: rpcError }; } }) },
    '@/lib/rate-limit': { rateLimitDiagnostic: () => ({ reason: 'UNEXPECTED_FAILURE' }), consumeRequestLimit: async () => { limits++; if (limit instanceof Error) throw limit; return limit; } },
  }, { fetch: async () => ({ ok: true, json: async () => captcha }) });
  let status, body;
  const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  await handler({ method: 'POST', body: { token: 'fixture-token', formData: form }, headers: {}, socket: { remoteAddress: '127.0.0.1' } }, res);
  return { status, body, limits, writes };
}
test('valid request reaches existing RPC and returns a reference', async () => {
  const r = await invoke(); assert.equal(r.status, 200); assert.match(r.body.customerRef, /^JRS-[A-Z0-9]{10}$/); assert.equal(r.writes, 1);
});
test('invalid fields are rejected before limiter or write', async () => {
  for (const patch of [{consent:false},{phone:'invalid'},{customer_name:{}},{service_type:'malicious'},{preferred_date:'2099-02-30'},{honeypot:'bot'}]) {
    const r = await invoke({form:{...valid(),...patch}}); assert.equal(r.status,400); assert.equal(r.body.code,'VALIDATION_FAILED'); assert.equal(r.writes,0); assert.equal(r.limits,0);
  }
});
test('CAPTCHA failure, wrong action and absent score never consume quota or write', async () => {
  for (const captcha of [{success:false},{success:true,score:.9,action:'other'},{success:true,action:'submit'}]) {
    const r=await invoke({captcha}); assert.equal(r.body.code,'CAPTCHA_INVALID'); assert.equal(r.limits,0); assert.equal(r.writes,0);
  }
});
test('limiter exhaustion and failure block database writes', async () => {
  for(const limit of [false,new Error('fixture')]) {const r=await invoke({limit});assert.equal(r.writes,0);assert.equal(r.status,limit===false?429:503);}
});
test('database error is not reported as CAPTCHA error', async () => {
  const r=await invoke({rpcError:{message:'missing RPC',code:'PGRST202'}});assert.equal(r.body.code,'REQUEST_SAVE_FAILED');assert.equal(r.status,500);
});
test('uncertain database outcome is distinct from a confirmed failure',async()=>{const r=await invoke({rpcThrow:true});assert.equal(r.body.code,'REQUEST_UNAVAILABLE');});
test('conditional limiter retries a concurrent increment and fails closed on errors', async () => {
  let updates=0;
  const client={from(){let update=false;const q={select(){return q},eq(){return q},gte:async()=>({data:[{id:'row',count:updates}],error:null}),update(){update=true;updates++;return q},then(resolve){return Promise.resolve({data:updates===1?[]:[{id:'row'}],error:null}).then(resolve)}};return q}};
  const {consumeRequestLimit}=load('src/lib/rate-limit.ts');assert.equal(await consumeRequestLimit(client,'127.0.0.1'),true);assert.equal(updates,2);
  const broken={from:()=>({select(){return this},eq(){return this},gte:async()=>({error:{message:'denied'}})})};
  await assert.rejects(consumeRequestLimit(broken,'127.0.0.1'),/RATE_LIMIT_UNAVAILABLE/);
});

test('rate-limit diagnostics distinguish database operations without leaking values', async () => {
  const {consumeRequestLimit, rateLimitDiagnostic, RateLimitError} = load('src/lib/rate-limit.ts');
  for (const stage of ['READ_FAILED', 'INSERT_FAILED', 'UPDATE_FAILED', 'DUPLICATE_ACTIVE_ROWS', 'UPDATE_CONFLICT', 'INVALID_COUNTER']) {
    const client = { from() {
      let updating = false;
      const q = {
        select(){return q}, eq(){return q},
        gte: async () => stage === 'READ_FAILED' ? {error:{code:'42501',message:'private IP and key'}} : {data: stage === 'INSERT_FAILED' ? [] : stage === 'DUPLICATE_ACTIVE_ROWS' ? [{id:'a',count:1},{id:'b',count:1}] : [{id:'a',count:stage==='INVALID_COUNTER'?null:1}]},
        insert: async () => ({error:{code:'42501',details:'private'}}),
        update(){updating=true;return q},
        then(resolve){return Promise.resolve(stage==='UPDATE_FAILED'?{error:{code:'42501',message:'private'}}:{data:[]}).then(resolve)},
      }; return q;
    }};
    await assert.rejects(consumeRequestLimit(client,'private-ip'),error => {
      const diagnostic=rateLimitDiagnostic(error);
      assert.equal(diagnostic.reason,stage);
      assert.ok(!JSON.stringify(diagnostic).includes('private'));
      return true;
    });
  }
  assert.equal(rateLimitDiagnostic(new RateLimitError('READ_FAILED','secret-value')).databaseCode,undefined);
  assert.equal(rateLimitDiagnostic(new Error('private')).reason,'UNEXPECTED_FAILURE');
});
