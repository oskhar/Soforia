import type {GameServer} from '../../shared/game-contracts.ts';
import {createPeta,tickPeta,petaAction,publicPeta,privatePeta,petaResult,neutralPeta} from './peta.ts';
const server:GameServer={create:base=>({...base,...createPeta(base.level-1,base.mode)}),tick:(g:any,inputs:any[],dt:number)=>tickPeta(g,inputs,dt),action:(g:any,slot:number,name:string,value?:unknown)=>petaAction(g,slot,name,value),publicState:(g:any)=>publicPeta(g),privateState:(g:any,slot:number)=>privatePeta(g,slot),neutral:(g:any)=>neutralPeta(g),result:(g:any)=>petaResult(g)};export default server;
