const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { before, beforeEach, after, test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../src/models");
const routes = require("../src/routes/auth/service-location.routes");
const owner = "507f1f77bcf86cd799439011", other = "507f1f77bcf86cd799439012";
const originals = { findById: User.findById, findOneAndUpdate: User.findOneAndUpdate };
const secret = randomBytes(32).toString("hex"), oldSecret = process.env.JWT_SECRET;
let users, server, base;
const copy = (value) => JSON.parse(JSON.stringify(value));
before(async () => {
 process.env.JWT_SECRET = secret;
 User.findById = async (id) => users[id] ? copy(users[id]) : null;
 User.findOneAndUpdate = (filter, update, options) => ({ select: async () => {
   assert.equal(options.runValidators, true); assert.equal(options.new, true);
   assert.deepEqual(Object.keys(update.$set), ["serviceLocation"]);
   const user = users[filter._id]; if (!user || user.role !== filter.role || user.status !== filter.status) return null;
   const document = new User({ fullName: "Customer", email: "test@example.invalid", passwordHash: "test", serviceLocation: update.$set.serviceLocation }); await document.validate();
   user.serviceLocation = copy(update.$set.serviceLocation); return copy(user);
 } });
 const app = express(); app.use(express.json()); app.use("/api/auth/me/service-location", routes);
 server = app.listen(0, "127.0.0.1"); await once(server,"listening"); base = `http://127.0.0.1:${server.address().port}/api/auth/me/service-location`;
});
beforeEach(() => { users = {
 [owner]: { _id: owner, status:"active", role:"customer", addresses:[{label:"Home",line1:"24 Lake Road",isDefault:true}], settings:{theme:"dark"} },
 [other]: { _id: other, status:"active", role:"customer", serviceLocation:{areaCity:"Colombo",source:"manual"} },
}; });
after(async () => { Object.assign(User,originals); if(oldSecret===undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET=oldSecret; await new Promise(resolve=>server.close(resolve)); });
async function request(method, body, id=owner, suffix="") {
 const response = await fetch(base+suffix,{method,headers:{"Content-Type":"application/json",...(id?{Authorization:`Bearer ${jwt.sign({id},secret)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:response.status,body:await response.json()};
}
const valid={areaCity:"Malabe, Sri Lanka",source:"manual"};
test("new customer has no service location",async()=>assert.equal((await request("GET")).body.data,null));
test("manual save trims and survives subsequent reads without touching addresses",async()=>{
 const before=copy(users); const result=await request("PATCH",{...valid,areaCity:"  Malabe, Sri Lanka  "});assert.equal(result.status,200);assert.deepEqual(result.body.data,valid);
 assert.deepEqual((await request("GET")).body.data,valid);assert.deepEqual(users[owner].addresses,before[owner].addresses);assert.deepEqual(users[owner].settings,before[owner].settings);assert.deepEqual(users[other],before[other]);
});
test("current coordinates saved and manual replacement clears old coordinates",async()=>{
 const current={...valid,source:"current",latitude:6.9,longitude:79.9};assert.deepEqual((await request("PATCH",current)).body.data,current);
 assert.deepEqual((await request("PATCH",valid)).body.data,valid);assert.equal(users[owner].serviceLocation.latitude,undefined);
});
for(const body of [{},{...valid,areaCity:" "},{...valid,areaCity:"x".repeat(121)},{...valid,areaCity:42},{...valid,source:"other"},{...valid,areaCity:"bad\u0000area"},{...valid,userId:other},{...valid,_id:other},{...valid,addresses:[]},{...valid,role:"admin"},{...valid,latitude:6},{...valid,source:"current"},{...valid,source:"current",latitude:91,longitude:10},{...valid,source:"current",latitude:10,longitude:181},{...valid,source:"current",latitude:"6",longitude:10}]) test(`invalid input ${JSON.stringify(body).slice(0,80)}`,async()=>{const before=copy(users);assert.equal((await request("PATCH",body)).status,400);assert.deepEqual(users,before);});
for(const role of ["provider","admin"]) test(`${role} cannot access customer endpoint`,async()=>{users[owner].role=role;assert.equal((await request("GET")).status,403);assert.equal((await request("PATCH",valid)).status,403);});
test("authentication required",async()=>assert.equal((await request("GET",undefined,null)).status,401));
test("query cannot select another user",async()=>{await request("PATCH",valid,owner,`?userId=${other}`);assert.equal(users[other].serviceLocation.areaCity,"Colombo");assert.equal((await request("GET",undefined,owner,`?userId=${other}`)).body.data.areaCity,valid.areaCity);});
