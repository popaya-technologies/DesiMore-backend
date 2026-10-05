const {test,before,beforeEach,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const express=require('express'),request=require('supertest'),XLSX=require('xlsx');
const {AppDataSource:db}=require('../src/data-source');
const {TaxRate}=require('../src/entities/tax-class.entity');
const {GeoZone}=require('../src/entities/geo_zone.entity');
const {CustomerGroup}=require('../src/entities/customer-group.entity');
const {validateTaxRate,taxRateQuery}=require('../src/services/tax-rate.service');
const auth=require('../src/middlewares/auth.middleware'),{RBACService}=require('../src/services/rbac.service');
const original={repo:db.getRepository.bind(db),transaction:db.transaction,auth:auth.authenticate,permission:RBACService.hasPermission};
let rows,groups,zones,granted,referenced,duplicate,failSave;
auth.authenticate=(req,res,next)=>{if(!req.get('x-role'))return res.status(401).json({message:'Unauthorized'});req.user={id:'test',userRole:req.get('x-role')};next();};
RBACService.hasPermission=async(_,resource,action)=>resource==='tax-rate'&&granted.includes(action);
const app=express();app.use(express.json());app.use('/api/tax-rates',require('../src/routes/tax-rate.routes').default);
const base='/api/tax-rates',api=request(app),call=(m,p=base,role='su')=>api[m](p).set('x-role',role);
const repo={create:(dto={})=>dto,save:async row=>{if(duplicate)throw {code:'23505'};if(failSave)throw Error('write failure');row.id??=randomUUID();row.createdAt??=new Date();row.updatedAt=new Date();rows.set(row.id,structuredClone(row));return row;},
 findOne:async({where:{id},relations,lock})=>{if(lock)assert.equal(lock.mode,'pessimistic_write');const r=rows.get(id);return r?{...structuredClone(r),...(relations?{geoZone:zones.get(r.geoZoneId)??null}: {})}:null;},
 delete:async ids=>{if(referenced)throw {code:'23503'};let affected=0;for(const id of Array.isArray(ids)?ids:[ids])affected+=rows.delete(id)?1:0;return {affected};},
 createQueryBuilder:alias=>{const qb=original.repo(TaxRate).createQueryBuilder(alias);const all=()=>[...rows.values()].map(r=>({...r,geoZone:zones.get(r.geoZoneId)??null}));qb.getManyAndCount=async()=>[all().slice(qb.expressionMap.skip,qb.expressionMap.skip+qb.expressionMap.take),rows.size];qb.getMany=async()=>all();return qb;}
};
const lookup=map=>({findOneBy:async({id})=>map.get(id)??null,find:async()=>[...map.values()]});
const repository=e=>e===TaxRate?repo:e===GeoZone?lookup(zones):lookup(groups);
before(async()=>{await db.buildMetadatas();db.getRepository=repository;db.transaction=async cb=>{const snapshot=structuredClone(rows);try{return await cb({getRepository:repository});}catch(e){rows=snapshot;throw e;}};});
beforeEach(()=>{rows=new Map();groups=new Map();zones=new Map();granted=[];referenced=false;duplicate=false;failSave=false;});
after(()=>{db.getRepository=original.repo;db.transaction=original.transaction;auth.authenticate=original.auth;RBACService.hasPermission=original.permission;});
test('metadata extends existing rate table without connecting',()=>{assert.equal(db.isInitialized,false);const m=db.getMetadata(TaxRate);assert.equal(m.tableName,'tax_rates');assert.equal(m.columns.find(c=>c.propertyName==='geoZoneId').isNullable,true);assert.equal(m.relations.find(r=>r.propertyName==='customerGroups').junctionEntityMetadata.tableName,'tax_rate_customer_groups');});
test('create edit defaults relations partial retention clear and options',async()=>{
 const group={id:randomUUID(),name:'Retail'},zone={id:randomUUID(),name:'Local'};groups.set(group.id,group);zones.set(zone.id,zone);
 const created=await call('post').send({name:' Test ',rate:2.5,customerGroupIds:[group.id],geoZoneId:zone.id});assert.equal(created.status,201);assert.equal(created.body.name,'Test');assert.equal(created.body.rate,'2.5000');assert.equal(created.body.type,'percentage');assert.equal(created.body.geoZone.name,'Local');assert.deepEqual(created.body.customerGroupIds,[group.id]);
 const path=base+'/'+created.body.id;assert.equal((await call('get',path)).status,200);
 const edited=await call('patch',path).send({rate:0,type:'fixed'});assert.equal(edited.body.rate,'0.0000');assert.deepEqual(edited.body.customerGroupIds,[group.id]);assert.equal(edited.body.geoZoneId,zone.id);
 const cleared=await call('put',path).send({customerGroupIds:[],geoZoneId:null});assert.deepEqual(cleared.body.customerGroupIds,[]);assert.equal(cleared.body.geoZoneId,null);
 assert.equal((await call('get',base+'/options')).body.customerGroups[0].name,'Retail');assert.equal((await call('get')).body.data[0].no,1);
});
test('strict validation and failed reference checks preserve saved data',async()=>{
 for(const body of [{},{name:'x'},{rate:1},{name:' ',rate:1},{name:'x',rate:'5'},{name:'x',rate:-1},{name:'x',rate:1.12345},{name:'x',rate:1,type:null},{name:'x',rate:1,customerGroupIds:null},{name:'x',rate:1,unknown:1}])await assert.rejects(validateTaxRate(body,true),e=>e.status===400);
 const id=(await call('post').send({name:'x',rate:1})).body.id;
 for(const patch of [{name:'Changed',customerGroupIds:[randomUUID()]},{geoZoneId:randomUUID()}])assert.equal((await call('patch',base+'/'+id).send(patch)).status,400);
 assert.equal(rows.get(id).name,'x');const uuid=randomUUID();assert.equal((await call('patch',base+'/'+id).send({customerGroupIds:[uuid,uuid.toUpperCase()]})).status,400);
 duplicate=true;assert.equal((await call('post').send({name:'x',rate:1})).status,409);
 assert.equal((await call('get',base+'/bad')).status,400);assert.equal((await call('get',base+'/'+randomUUID())).status,404);
});
test('authentication and all scoped permissions',async()=>{
 const id=(await call('post').send({name:'x',rate:1})).body.id;
 for(const [method,path,permission,body] of [['get',base,'read'],['get',base+'/options','read'],['get',base+'/export','read'],['get',base+'/'+id,'read'],['post',base,'create',{name:'y',rate:1}],['put',base+'/'+id,'update',{name:'z'}],['patch',base+'/'+id,'update',{rate:2}],['delete',base+'/bulk','delete',{ids:[id]}]]){
 granted=[];assert.equal((await api[method](path).send(body)).status,401);assert.equal((await call(method,path,'admin').send(body)).status,403);granted=[permission];assert.equal((await call(method,path,'admin').send(body)).status,method==='post'?201:200);
 }
});
test('bulk deletion rollback and referenced rates protected',async()=>{
 const id=(await call('post').send({name:'x',rate:1})).body.id;
 assert.equal((await call('delete',base+'/bulk').send({ids:[id,randomUUID()]})).status,404);assert.equal(rows.size,1);
 referenced=true;assert.equal((await call('delete',base+'/'+id)).status,409);assert.equal((await call('delete',base+'/bulk').send({ids:[id]})).status,409);assert.equal(rows.size,1);
 for(const ids of [[],['bad'],[id,id.toUpperCase()]])assert.equal((await call('delete',base+'/bulk').send({ids})).status,400);
 referenced=false;assert.equal((await call('delete',base+'/bulk').send({ids:[id]})).body.deletedCount,1);
});
test('query validation parameterization and paginated row numbering',async()=>{
 const {qb}=taxRateQuery({search:"%' OR true --",date:'2026-10-05',sortBy:'rate',sortOrder:'DESC'});const [sql,params]=qb.getQueryAndParameters();assert.ok(!sql.includes('OR true'));assert.ok(params.includes("%\\%' OR true --%"));assert.ok(params.includes('2026-10-05'));assert.match(sql,/rate.*DESC/);
 for(const q of [{date:'2026-02-30'},{limit:'101'},{page:'0'},{sortBy:'password'},{sortOrder:'bad'},{search:[]},{unknown:'x'}])assert.throws(()=>taxRateQuery(q),e=>e.status===400);
 await call('post').send({name:'first',rate:1});await call('post').send({name:'second',rate:2});const list=await call('get').query({page:2,limit:1});assert.equal(list.body.data.length,1);assert.equal(list.body.data[0].no,2);assert.equal(list.body.meta.total,2);
});
test('CSV and Excel contain safe form columns',async()=>{
 await call('post').send({name:'=1+1',rate:1});const csv=await call('get',base+'/export');assert.equal(csv.status,200);assert.ok(csv.text.includes("'=1+1"));assert.ok(csv.text.includes('Geo Zone'));
 const file=await call('get',base+'/export').query({format:'xlsx'}).buffer(true).parse((res,cb)=>{const parts=[];res.on('data',p=>parts.push(p));res.on('end',()=>cb(null,Buffer.concat(parts)));});assert.equal(file.status,200);const book=XLSX.read(file.body,{type:'buffer'});assert.equal(XLSX.utils.sheet_to_json(book.Sheets['Tax Rates'])[0]['Tax Name'],"'=1+1");
});
