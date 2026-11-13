const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 for(const mode of ['database','limiter','network','non-json','success']){
  const page=await browser.newPage();
  await page.addInitScript(()=>{localStorage.setItem('jrs-request-form',JSON.stringify({name:'Test Person',phone:'+592 699 2175',email:'test@example.com',region:'Region 4',village:'Georgetown',services:['Garden Design & Planting'],preferredDate:'2099-01-01',propertyDescription:'Test garden',specialRequirements:'',whatsappOptIn:false,consent:true}));window.open=(url)=>{window.__opened=url;return null;};});
  await page.route('https://www.google.com/recaptcha/**',route=>route.fulfill({contentType:'application/javascript',body:'window.grecaptcha={ready:fn=>fn(),execute:()=>Promise.resolve("fixture-token")};'}));
  let calls=0;
  await page.route('**/api/verify-recaptcha',async route=>{calls++;if(mode==='network')return route.abort();if(mode==='non-json')return route.fulfill({status:502,contentType:'text/html',body:'upstream unavailable'});return route.fulfill({status:mode==='success'?200:500,contentType:'application/json',body:JSON.stringify(mode==='success'?{success:true,pendingId:'fixture',customerRef:'JRS-ABCDEFGHIJ'}:mode==='limiter'?{code:'RATE_LIMIT_UNAVAILABLE',diagnosticId:'12345678-1234-1234-1234-123456789abc'}:{code:'REQUEST_SAVE_FAILED',error:'private database detail'})});});
  await page.goto('http://127.0.0.1:3002/request');
  await page.waitForFunction(()=>!!window.grecaptcha);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await page.getByRole('button',{name:mode==='success'?'Submit & Continue on WhatsApp':'Submit Request',exact:true}).click();
  if(mode==='success'){
   await page.getByRole('heading',{name:'Request Submitted'}).waitFor();
   const url=await page.evaluate(()=>window.__opened);assert.equal(new URL(url).searchParams.get('text'),'Service Request (JRS-ABCDEFGHIJ)\nName: Test Person');
  }else{
   await page.locator('div[role=alert]').waitFor();
   const button=page.getByRole('button',{name:'Submit Request',exact:true});
   assert.equal(await button.isDisabled(),!['database','limiter'].includes(mode));
   await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='alert');
   const text=await page.locator('div[role=alert]').innerText();
   if(mode==='limiter') assert.ok(text.includes('Support reference: 12345678-1234-1234-1234-123456789abc'));assert.ok(!text.includes('reCAPTCHA verification failed'));assert.ok(!text.includes('private database detail'));
  }
  assert.equal(calls,1);console.log('PASS',mode);await page.close();
 }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
