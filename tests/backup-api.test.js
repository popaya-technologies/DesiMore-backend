const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const { AppDataSource: db } = require('../src/data-source');
const { BackupService, backupService, selection, parseBackup, restoreOrder } = require('../src/services/backup.service');
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const original = { auth: auth.authenticate, permission: RBACService.hasPermission, query: db.query, transaction: db.transaction };
let granted;
auth.authenticate = (req, res, next) => {
  if (!req.get('x-user')) return res.status(401).json({message:'Unauthorized'});
  req.user = { id: req.get('x-user'), userRole: req.get('x-role') || 'admin' }; next();
};
RBACService.hasPermission = async (_id, resource, action) => resource === 'backup' && granted.includes(action);
const app = express(); app.use(express.json()); app.use('/api/backup', require('../src/routes/backup.routes').default);
const api = request(app), base = '/api/backup';
const column = (table, name, type, identity = false, generated = false) => ({ table, name, type, identity, generated });
const catalogRows = [column('items','id','bigint',true),column('items','amount','numeric(20,8)'),column('items','details','jsonb'),column('items','computed','text',false,true)];
const sample = () => ({format:'desimore-backup',version:1,createdAt:new Date().toISOString(),tables:[{name:'items',columns:catalogRows.filter(c=>!c.generated).map(c=>({name:c.name,type:c.type})),rows:[['9007199254740993','0.12345678','{"hello":"世界"}']]}]});
function fakeDatabase({ keys = [], fail = false, locked = true } = {}) {
  const calls = []; let committed = false, rolledBack = false;
  const query = async (sql, params) => {
    calls.push({sql,params});
    if(sql.includes('pg_catalog.pg_attribute')) return catalogRows;
    if(sql.includes('pg_catalog.pg_constraint')) return keys;
    if(sql.includes('pg_try_advisory')) return [{locked}];
    if(sql.includes('FROM "public"."items" LIMIT')) return [{c0:'9007199254740993',c1:'0.12345678',c2:'{"hello":"世界"}'}];
    if(sql.startsWith('INSERT') && fail) throw {code:'23503'};
    if(sql.includes('pg_get_serial_sequence')) return params[1] === 'id' ? [{schema:'public',name:'items_id_seq',increment:'1',start:'1',min:'1',max:'9223372036854775807'}] : [];
    if(sql.startsWith('SELECT MAX')) return [{value:'9007199254740993'}];
    return [];
  };
  return {calls,query, get committed(){return committed}, get rolledBack(){return rolledBack},
    transaction: async (level, callback) => { const cb = callback || level; try { const value=await cb({query});committed=true;return value;} catch(e){rolledBack=true;throw e;} } };
}
async function finish(service, id, owner='admin') {
  for(let i=0;i<100;i++) {
    const job=service.progress(id,owner,false);
    if(['completed','failed'].includes(job.status)) return job;
    await new Promise(resolve=>setImmediate(resolve));
  }
  throw new Error('Job did not finish');
}
beforeEach(()=>{granted=[];const fake=fakeDatabase();db.query=fake.query;db.transaction=fake.transaction;});
after(()=>{auth.authenticate=original.auth;RBACService.hasPermission=original.permission;db.query=original.query;db.transaction=original.transaction;});
test('table selection and malformed backups are rejected before execution',()=>{
 for(const input of [null,[],{}, {tables:[]},{tables:['items','items']},{tables:['items'],sql:'DROP TABLE users'}]) assert.throws(()=>selection(input),e=>e.status===400);
 for(const file of ['DROP TABLE users', '{}',JSON.stringify({...sample(),version:2}),JSON.stringify({...sample(),tables:[{...sample().tables[0],rows:[[1,2,3]]}]})]) assert.throws(()=>parseBackup(Buffer.from(file)),e=>e.status===400);
 const valid=sample();assert.deepEqual(parseBackup(Buffer.from(JSON.stringify(valid))),valid);
});
test('export preserves exact PostgreSQL text and excludes generated columns',async()=>{
 const fake=fakeDatabase(), service=new BackupService(fake);
 const file=parseBackup(await service.export({tables:['items']}));
 assert.deepEqual(file.tables[0].rows,sample().tables[0].rows);
 assert.deepEqual(file.tables[0].columns,sample().tables[0].columns);
 assert.ok(fake.calls.some(c=>c.sql==='SET TRANSACTION READ ONLY'));
 await assert.rejects(service.export({tables:['items"; DROP TABLE users;--']}),e=>e.status===400);
 assert.ok(!fake.calls.some(c=>c.sql.includes('DROP TABLE')));
});
test('foreign key order includes dependent tables and rejects unsafe cycles',()=>{
 const fk=(child,parent,deferred=false)=>({child,parent,deferred,childSchema:'public',parentSchema:'public'});
 assert.deepEqual(restoreOrder(['child','parent'],[fk('child','parent')]),['parent','child']);
 assert.throws(()=>restoreOrder(['parent'],[fk('child','parent')]),e=>e.status===400);
 assert.throws(()=>restoreOrder(['a','b'],[fk('a','b'),fk('b','a')]),e=>e.status===400);
 assert.deepEqual(restoreOrder(['a','b'],[fk('a','b',true),fk('b','a',true)]),['a','b']);
 assert.deepEqual(restoreOrder(['a'],[fk('a','a')]),['a']);
});
test('restore commits typed parameterized rows, identity values and transactional sequence repair',async()=>{
 const fake=fakeDatabase(), service=new BackupService(fake);
 const job=service.start(sample(),'admin');assert.equal(job.status,'queued');assert.ok(!('ownerId' in job));
 assert.throws(()=>service.start(sample(),'admin'),e=>e.status===409);
 assert.throws(()=>service.progress(job.id,'other',false),e=>e.status===404);
 const done=await finish(service,job.id);assert.equal(done.status,'completed');assert.equal(done.progress,100);assert.equal(done.restoredRows,1);assert.equal(fake.committed,true);
 const insert=fake.calls.find(c=>c.sql.startsWith('INSERT'));
 assert.match(insert.sql,/OVERRIDING SYSTEM VALUE/);assert.match(insert.sql,/CAST\("details" AS jsonb\)/);
 assert.match(insert.sql,/"details" text/);assert.ok(!insert.sql.includes('世界'));assert.equal(JSON.parse(insert.params[0])[0].id,'9007199254740993');
 assert.ok(fake.calls.some(c=>c.sql==='ALTER SEQUENCE "public"."items_id_seq" RESTART WITH 9007199254740994'));
 assert.ok(fake.calls.some(c=>c.sql==='TRUNCATE TABLE "public"."items" RESTART IDENTITY RESTRICT'));
});
test('restore failures roll back and mismatched schema never truncates data',async()=>{
 const fake=fakeDatabase({fail:true}), service=new BackupService(fake);
 const done=await finish(service,service.start(sample(),'admin').id);
 assert.equal(done.status,'failed');assert.equal(done.restoredRows,0);assert.equal(fake.rolledBack,true);assert.equal(fake.committed,false);
 const clean=fakeDatabase(), other=new BackupService(clean), file=sample();file.tables[0].columns[0].type='text; DROP TABLE users';
 const rejected=await finish(other,other.start(file,'admin').id);assert.equal(rejected.status,'failed');assert.ok(!clean.calls.some(c=>c.sql.startsWith('TRUNCATE')));
 const busy=fakeDatabase({locked:false}), serviceBusy=new BackupService(busy);
 assert.equal((await finish(serviceBusy,serviceBusy.start(sample(),'admin').id)).status,'failed');assert.ok(!busy.calls.some(c=>c.sql.startsWith('TRUNCATE')));
});
test('routes enforce authentication and separate permissions before processing uploads',async()=>{
 for(const [method,path,body] of [['get','/tables'],['post','/export',{tables:['items']}],['post','/restore'],['get','/restore/'+randomUUID()]]) {
   assert.equal((await api[method](base+path).send(body)).status,401);
   assert.equal((await api[method](base+path).set('x-user','admin').send(body)).status,403);
 }
 granted=['read'];assert.equal((await api.get(base+'/tables').set('x-user','admin')).body.data[0].name,'items');
 granted=['export'];const exported=await api.post(base+'/export').set('x-user','admin').send({tables:['items']});assert.equal(exported.status,200);assert.match(exported.headers['content-disposition'],/attachment/);
 granted=['restore'];assert.equal((await api.post(base+'/restore').set('x-user','admin').field('confirm','RESTORE')).status,400);
 assert.equal((await api.post(base+'/restore').set('x-user','admin').attach('file',Buffer.from(JSON.stringify(sample())),'backup.json')).status,400);
 assert.equal((await api.post(base+'/restore').set('x-user','admin').field('confirm','RESTORE').attach('file',Buffer.from('DELETE FROM users'),'backup.sql')).status,400);
 const restore=await api.post(base+'/restore').set('x-user','admin').field('confirm','RESTORE').attach('file',Buffer.from(JSON.stringify(sample())),'backup.json');assert.equal(restore.status,202);
 await finish(backupService,restore.body.id);
 const progress=await api.get(base+'/restore/'+restore.body.id).set('x-user','admin');assert.equal(progress.body.status,'completed');
 assert.equal((await api.get(base+'/restore/'+restore.body.id).set('x-user','other')).status,404);
 assert.equal((await api.get(base+'/restore/bad').set('x-user','admin')).status,400);
});
