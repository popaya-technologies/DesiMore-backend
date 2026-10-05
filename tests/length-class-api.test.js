const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express'), request = require('supertest'), XLSX = require('xlsx');
const { AppDataSource: db } = require('../src/data-source');
const { LengthClass } = require('../src/entities/length-class.entity');
const { lengthClassQuery, validateLengthClass } = require('../src/services/length-class.service');
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const original = { repo: db.getRepository.bind(db), transaction: db.transaction, auth: auth.authenticate, permission: RBACService.hasPermission };
let rows, granted, duplicate;
auth.authenticate = (req,res,next) => { if (!req.get('x-role')) return res.status(401).json({message:'Unauthorized'}); req.user = {id:'test',userRole:req.get('x-role')}; next(); };
RBACService.hasPermission = async (_,resource,action) => resource === 'length-class' && granted.includes(action);
const app = express(); app.use(express.json()); app.use('/api/length-classes',require('../src/routes/length-class.routes').default);
const api=request(app), base='/api/length-classes';
const call=(method,path=base,role='su')=>api[method](path).set('x-role',role);
const repo={
 create: dto=>dto,
 save: async dto=>{if(duplicate) throw {code:'23505'}; const row={id:randomUUID(),createdAt:new Date(),updatedAt:new Date(),...dto};rows.set(row.id,row);return row;},
 update: async(id,dto)=>{if(duplicate)throw {code:'23505'};if(!rows.has(id))return {affected:0};Object.assign(rows.get(id),dto);return {affected:1};},
 findOneBy: async({id})=>rows.get(id)??null,
 findOne: async({where:{id},lock})=>{assert.equal(lock.mode,'pessimistic_write');return rows.get(id)??null;},
 delete: async ids=>{let affected=0;for(const id of Array.isArray(ids)?ids:[ids])affected+=rows.delete(id)?1:0;return {affected};},
 createQueryBuilder: alias=>{const qb=original.repo(LengthClass).createQueryBuilder(alias);qb.getManyAndCount=async()=>[[...rows.values()],rows.size];qb.getMany=async()=>[...rows.values()];return qb;}
};
before(async()=>{await db.buildMetadatas();db.getRepository=()=>repo;db.transaction=async cb=>{const snapshot=structuredClone(rows);try{return await cb({getRepository:()=>repo});}catch(e){rows=snapshot;throw e;}};});
beforeEach(()=>{rows=new Map();granted=[];duplicate=false;});
after(()=>{db.getRepository=original.repo;db.transaction=original.transaction;auth.authenticate=original.auth;RBACService.hasPermission=original.permission;});
test('numeric defaults, decimal values and partial updates retain omitted fields',async()=>{
 const created=await call('post').send({lengthTitle:' Meter ',lengthUnit:' m '});
 assert.equal(created.status,201);assert.equal(created.body.value,1);assert.equal(created.body.lengthUnit,'m');
 const updated=await call('patch',base+'/'+created.body.id).send({value:0.0254});
 assert.equal(updated.status,200);assert.equal(updated.body.value,0.0254);assert.equal(updated.body.lengthTitle,'Meter');assert.equal(updated.body.lengthUnit,'m');
 const transformer=db.getMetadata(LengthClass).columns.find(c=>c.propertyName==='value').transformer;
 assert.equal(transformer.from('0.02540000'),0.0254);
 for(const value of [0,-1,null,'1',true,1.123456789,1000000000000,Infinity,NaN]) await assert.rejects(validateLengthClass({lengthTitle:'Meter',lengthUnit:'m',value},true),e=>e.status===400);
 for(const body of [{lengthTitle:'Meter'},{lengthUnit:'m'},{lengthTitle:'Meter',lengthUnit:' '},{lengthTitle:'Meter',lengthUnit:'x'.repeat(33)},{lengthTitle:'Meter',lengthUnit:'m\u0000'}]) await assert.rejects(validateLengthClass(body,true),e=>e.status===400);
 assert.equal((await call('patch',base+'/'+created.body.id).send({lengthTitle:null})).status,400);
 assert.equal((await call('patch',base+'/'+randomUUID()).send({value:1})).status,404);
});
test('schema metadata and no database connection',()=>{assert.equal(db.isInitialized,false);assert.equal(db.getMetadata(LengthClass).tableName,'length_classes');assert.equal(db.getMetadata(LengthClass).columns.find(c=>c.propertyName==='lengthTitle').length,'100');});
test('create detail update list and single deletion',async()=>{
 const created=await call('post').send({lengthUnit:'cm',lengthTitle:' Awaiting Products '});assert.equal(created.status,201);assert.equal(created.body.lengthTitle,'Awaiting Products');const path=base+'/'+created.body.id;
 assert.equal((await call('get',path)).status,200);assert.equal((await call('put',path).send({lengthUnit:'cm',lengthTitle:'Received'})).body.lengthTitle,'Received');assert.equal((await call('patch',path).send({lengthUnit:'cm',lengthTitle:'Complete'})).status,200);
 const list=await call('get').query({page:2,limit:10});assert.equal(list.body.data[0].no,11);assert.equal(list.body.meta.total,1);
 assert.equal((await call('delete',path)).status,200);assert.equal((await call('get',path)).status,404);
});
test('invalid fields identifiers and duplicates',async()=>{
 for(const body of [{},null,[],{lengthUnit:'cm',lengthTitle:''},{lengthUnit:'cm',lengthTitle:' '},{lengthUnit:'cm',lengthTitle:'x'.repeat(101)},{lengthUnit:'cm',lengthTitle:'x\u0000'},{lengthUnit:'cm',lengthTitle:null},{lengthUnit:'cm',lengthTitle:'x',extra:true}])await assert.rejects(validateLengthClass(body,true),e=>e.status===400);
 assert.equal((await call('get',base+'/bad')).status,400);duplicate=true;assert.equal((await call('post').send({lengthUnit:'cm',lengthTitle:'x'})).status,409);
});
test('all routes enforce authentication and individual permissions',async()=>{
 const id=(await call('post').send({lengthUnit:'cm',lengthTitle:'x'})).body.id;
 for(const [method,path,permission,body] of [['get',base,'read'],['get',base+'/export','read'],['get',base+'/'+id,'read'],['post',base,'create',{lengthUnit:'cm',lengthTitle:'y'}],['patch',base+'/'+id,'update',{lengthUnit:'cm',lengthTitle:'z'}],['put',base+'/'+id,'update',{lengthUnit:'cm',lengthTitle:'a'}],['delete',base+'/bulk','delete',{ids:[id]}]]){
  granted=[];assert.equal((await api[method](path).send(body)).status,401);assert.equal((await call(method,path,'admin').send(body)).status,403);granted=[permission];assert.equal((await call(method,path,'admin').send(body)).status,method==='post'?201:200);
 }
});
test('search dates sorting and pagination use validated parameterized queries',()=>{
 const {qb,page,limit}=lengthClassQuery({search:"%' OR true --",date:'2026-10-03',page:'2',limit:'5',sortBy:'lengthTitle',sortOrder:'DESC'});const [sql,params]=qb.getQueryAndParameters();assert.equal(page,2);assert.equal(limit,5);assert.ok(!sql.includes('OR true'));assert.ok(params.includes("%\\%' OR true --%"));assert.ok(params.includes('2026-10-03'));assert.match(sql,/ORDER BY/);
 for(const q of [{date:'2026-02-30'},{page:'0'},{limit:'101'},{sortBy:'password'},{sortOrder:'bad'},{search:[]},{unknown:'x'},{startDate:'2026-10-03',endDate:'2026-10-01'}])assert.throws(()=>lengthClassQuery(q),e=>e.status===400);
});
test('bulk missing IDs rollback; duplicate/malformed IDs rejected; valid batch deletes',async()=>{
 const id=(await call('post').send({lengthUnit:'cm',lengthTitle:'x'})).body.id;
 assert.equal((await call('delete',base+'/bulk').send({ids:[id,randomUUID()]})).status,404);assert.equal(rows.size,1);
 for(const ids of [[],[id,id.toUpperCase()],['bad'],Array.from({length:101},()=>randomUUID())])assert.equal((await call('delete',base+'/bulk').send({ids})).status,400);
 const deleted=await call('delete',base+'/bulk').send({ids:[id]});assert.equal(deleted.body.deletedCount,1);assert.equal(rows.size,0);
});
test('CSV and XLSX export safe names',async()=>{
 await call('post').send({lengthUnit:'cm',lengthTitle:'=1+1'});const csv=await call('get',base+'/export');assert.equal(csv.status,200);assert.ok(csv.text.includes("'=1+1"));
 const file=await call('get',base+'/export').query({format:'xlsx'}).buffer(true).parse((res,cb)=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>cb(null,Buffer.concat(parts)));});assert.equal(file.status,200);const book=XLSX.read(file.body,{type:'buffer'});assert.equal(XLSX.utils.sheet_to_json(book.Sheets['Length Classes'])[0]['Length Title'],"'=1+1");
 assert.equal((await call('get',base+'/export').query({format:'pdf'})).status,400);
});
