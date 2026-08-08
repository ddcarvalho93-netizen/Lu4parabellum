import { describe, it } from "node:test"; import assert from "node:assert/strict";
import { crystalLedger, initialData, PLAYERS, validateData } from "../app/lib/model.ts";
describe("ParabelluM ledger",()=>{
 it("splits a kept item as debt to the four others",()=>{const d=structuredClone(initialData);d.drops.push({id:"1",at:"2026-01-01",item:"Sword",crystals:100,keeper:"Ardranes",note:""});const l=crystalLedger(d);assert.equal(l.Ardranes,-80);PLAYERS.slice(1).forEach(p=>assert.equal(l[p],20));assert.equal(Object.values(l).reduce((a,b)=>a+b,0),0)});
 it("supports multiple keepers and preserves settlement conservation",()=>{const d=structuredClone(initialData);d.drops.push({id:"1",at:"x",item:"A",crystals:100,keeper:"Ardranes",note:""},{id:"2",at:"x",item:"B",crystals:50,keeper:"Sooul",note:""});const l=crystalLedger(d);assert.equal(Object.values(l).reduce((a,b)=>a+b,0),0)});
 it("offsets a keeper debt with future batches",()=>{const d=structuredClone(initialData);d.drops.push({id:"1",at:"x",item:"A",crystals:100,keeper:"Ardranes",note:""});d.crystalPayments.push({id:"p",at:"x",crystals:100,note:""});const l=crystalLedger(d);assert.equal(l.Ardranes,-60);assert.ok(PLAYERS.slice(1).every(p=>l[p]===15));assert.equal(Object.values(l).reduce((a,b)=>a+b,0),0)});
 it("rejects invalid monetary values",()=>{const d=structuredClone(initialData);d.cycles[0].value=-1;assert.ok(validateData(d).length>0)});
});
