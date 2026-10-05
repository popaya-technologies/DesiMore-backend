const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express'), request = require('supertest'), XLSX = require('xlsx');
const { AppDataSource: db } = require('../src/data-source');
const { TaxClass, TaxClassRule, TaxRate } = require('../src/entities/tax-class.entity');
const { validateTaxClass, taxClassQuery, TaxClassService } = require('../src/services/tax-class.service');
const auth = require('../src/middlewares/auth.middleware');
const { RBACService } = require('../src/services/rbac.service');
const original = { repo: db.getRepository.bind(db), transaction: db.transaction, auth: auth.authenticate, permission: RBACService.hasPermission };
let classes, rules, rates, granted, failRules, duplicate;
auth.authenticate = (req,res,next) => { if (!req.get('x-role')) return res.status(401).json({message:'Unauthorized'}); req.user={id:'test',userRole:req.get('x-role')}; next(); };
RBACService.hasPermission = async (_,resource,action) => resource === 'tax-class' && granted.includes(action);
const app=express();app.use(express.json());app.use('/api/tax-classes',require('../src/routes/tax-class.routes').default);
const base='/api/tax-classes',api=request(app),call=(m,p=base,role='su')=>api[m](p).set('x-role',role);
const body = extra => ({ title:'Goods',description:'Configured rules',...extra });
const classRepo={
 create: (dto={})=>dto,
 save: async row=>{if(duplicate)throw {code:'23505'};row.id??=randomUUID();row.createdAt??=new Date();row.updatedAt=new Date();classes.set(row.id,structuredClone(row));return row;},
 findOne:async({where:{id},relations,lock})=>{if(lock)assert.equal(lock.mode,'pessimistic_write');const row=classes.get(id);if(!row)return null;return {...structuredClone(row),...(relations?{rules:rules.filter(r=>r.taxClassId===id).sort((a,b)=>a.priority-b.priority).map(r=>({...r,taxRate:rates.get(r.taxRateId)}))}:{})};},
 delete:async ids=>{let affected=0;for(const id of Array.isArray(ids)?ids:[ids]){affected+=classes.delete(id)?1:0;rules=rules.filter(r=>r.taxClassId!==id);}return {affected};},
 createQueryBuilder:alias=>{const qb=original.repo(TaxClass).createQueryBuilder(alias);qb.getManyAndCount=async()=>[[...classes.values()].slice(qb.expressionMap.skip,qb.expressionMap.skip+qb.expressionMap.take),classes.size];qb.getMany=async()=>[...classes.values()];return qb;}
};
const ruleRepo={create:r=>r,delete:async({taxClassId})=>{rules=rules.filter(r=>r.taxClassId!==taxClassId);},save:async rows=>{if(failRules)throw Error('rule write failed');const saved=rows.map(r=>({...r,id:randomUUID()}));rules.push(...saved);return saved;}};
const rateRepo={create:r=>r,save:async r=>{r={...r,id:randomUUID()};rates.set(r.id,r);return r;},findOne:async({where:{id},lock})=>{assert.equal(lock.mode,'pessimistic_read');return rates.get(id)??null;},find:async()=>[...rates.values()]};
const repository=entity=>entity===TaxClass?classRepo:entity===TaxClassRule?ruleRepo:rateRepo;
before(async()=>{await db.buildMetadatas();db.getRepository=repository;db.transaction=async cb=>{const snapshot=structuredClone({classes,rules,rates});try{return await cb({getRepository:repository});}catch(e){({classes,rules,rates}=snapshot);throw e;}};});
beforeEach(()=>{classes=new Map();rules=[];rates=new Map();granted=[];failRules=false;duplicate=false;});
after(()=>{db.getRepository=original.repo;db.transaction=original.transaction;auth.authenticate=original.auth;RBACService.hasPermission=original.permission;});
const makeRate=async()=>{const response=await call('post',base+'/tax-rates').send({name:'Configured rate',rate:2.5});assert.equal(response.status,201);return response.body.id;};
test('schema relationships match manual SQL and database never initialized',()=>{
 assert.equal(db.isInitialized,false);assert.equal(db.getMetadata(TaxClass).tableName,'tax_classes');
 const foreignKeys=db.getMetadata(TaxClassRule).foreignKeys;
 assert.equal(foreignKeys.find(f=>f.columnNames.includes('taxClassId')).onDelete,'CASCADE');
 assert.equal(foreignKeys.find(f=>f.columnNames.includes('taxRateId')).onDelete,'RESTRICT');
});
test('create detail partial update replace and clear rules',async()=>{
 const rate=await makeRate();assert.equal((await call('get',base+'/tax-rates')).body.data.length,1);
 const created=await call('post').send(body({rules:[{taxRateId:rate}]}));assert.equal(created.status,201);assert.equal(created.body.rules[0].priority,1);assert.equal(created.body.rules[0].basedOn,'shipping');
 const path=base+'/'+created.body.id;assert.equal((await call('get',path)).body.rules[0].taxRate.name,'Configured rate');
 const renamed=await call('patch',path).send({title:'Other'});assert.equal(renamed.body.description,'Configured rules');assert.equal(renamed.body.rules.length,1);
 const replaced=await call('put',path).send({rules:[{taxRateId:rate,basedOn:'payment',priority:0}]});assert.equal(replaced.body.rules[0].basedOn,'payment');assert.equal(replaced.body.rules.length,1);
 assert.equal((await call('patch',path).send({rules:[]})).body.rules.length,0);
 assert.equal((await call('get')).body.data[0].no,1);
 assert.equal((await call('delete',path)).status,200);assert.equal(rates.size,1);assert.equal((await call('get',path)).status,404);
});
test('nested validation rejects nulls unknown fields invalid rates and duplicate rules',async()=>{
 const rate=randomUUID();
 for(const payload of [{},null,[],body({title:' '}),body({description:null}),body({rules:[null]}),body({rules:[{taxRateId:'bad'}]}),body({rules:[{taxRateId:rate,priority:'1'}]}),body({rules:[{taxRateId:rate,basedOn:'other'}]}),body({rules:[{taxRateId:rate},{taxRateId:rate.toUpperCase()}]}),body({rules:null}),body({unknown:true})])await assert.rejects(validateTaxClass(payload,true),e=>e.status===400);
 assert.equal((await call('post').send(body({rules:[{taxRateId:rate}]}))).status,400);assert.equal(classes.size,0);
 for(const value of [{name:'x',rate:-1},{name:'x',rate:1.12345},{name:'x',rate:'5'},{name:'x',rate:5,type:'other'}])assert.equal((await call('post',base+'/tax-rates').send(value)).status,400);
});
test('transaction rolls back title and rules when replacement fails',async()=>{
 const rate=await makeRate();const created=(await call('post').send(body({rules:[{taxRateId:rate}]}))).body;
 failRules=true;await assert.rejects(new TaxClassService().save({title:'Changed',rules:[{taxRateId:rate,basedOn:'store'}]},created.id));
 assert.equal(classes.get(created.id).title,'Goods');assert.equal(rules.length,1);assert.equal(rules[0].basedOn,'shipping');
});
test('scoped authentication permissions protect all endpoints',async()=>{
 const id=(await call('post').send(body())).body.id;
 for(const [method,path,permission,payload] of [['get',base,'read'],['get',base+'/export','read'],['get',base+'/tax-rates','read'],['post',base+'/tax-rates','create',{name:'x',rate:1}],['get',base+'/'+id,'read'],['post',base,'create',body({title:'New'})],['put',base+'/'+id,'update',{title:'Updated'}],['patch',base+'/'+id,'update',{description:'Updated'}],['delete',base+'/bulk','delete',{ids:[id]}]]){
 granted=[];assert.equal((await api[method](path).send(payload)).status,401);assert.equal((await call(method,path,'admin').send(payload)).status,403);granted=[permission];assert.equal((await call(method,path,'admin').send(payload)).status,method==='post'?201:200);
 }
});
test('bulk deletion validates all IDs before deleting any class and rules',async()=>{
 const rate=await makeRate();const id=(await call('post').send(body({rules:[{taxRateId:rate}]}))).body.id;
 assert.equal((await call('delete',base+'/bulk').send({ids:[id,randomUUID()]})).status,404);assert.equal(classes.size,1);assert.equal(rules.length,1);
 for(const ids of [[],[id,id.toUpperCase()],['bad'],Array.from({length:101},()=>randomUUID())])assert.equal((await call('delete',base+'/bulk').send({ids})).status,400);
 assert.equal((await call('delete',base+'/bulk').send({ids:[id]})).body.deletedCount,1);assert.equal(rules.length,0);assert.equal(rates.size,1);
});
test('query SQL filters sorts and pagination are validated',()=>{
 const {qb,page,limit}=taxClassQuery({search:"%' OR true --",date:'2026-10-05',page:'2',limit:'5',sortBy:'title',sortOrder:'DESC'});const [sql,params]=qb.getQueryAndParameters();assert.equal(page,2);assert.equal(limit,5);assert.ok(!sql.includes('OR true'));assert.ok(params.includes("%\\%' OR true --%"));assert.ok(params.includes('2026-10-05'));assert.match(sql,/title.*DESC/);
 for(const q of [{date:'2026-02-30'},{page:'0'},{limit:'101'},{sortBy:'password'},{sortOrder:'bad'},{search:[]},{unknown:'x'},{startDate:'2026-10-03',endDate:'2026-10-01'}])assert.throws(()=>taxClassQuery(q),e=>e.status===400);
});
test('CSV XLSX safe export and duplicate titles',async()=>{
 await call('post').send(body({title:'=1+1'}));const csv=await call('get',base+'/export');assert.equal(csv.status,200);assert.ok(csv.text.includes("'=1+1"));
 const file=await call('get',base+'/export').query({format:'xlsx'}).buffer(true).parse((res,cb)=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>cb(null,Buffer.concat(parts)));});assert.equal(file.status,200);const book=XLSX.read(file.body,{type:'buffer'});assert.equal(XLSX.utils.sheet_to_json(book.Sheets['Tax Classes'])[0]['Tax Class Title'],"'=1+1");
 duplicate=true;assert.equal((await call('post').send(body())).status,409);assert.equal((await call('get',base+'/bad-id')).status,400);
});
