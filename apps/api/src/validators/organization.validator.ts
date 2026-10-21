import type { Request } from "express";
export interface CreateOrganizationBody { name:string; address?:string|null; location?:string|null; ownerName:string; ownerEmail:string; }
export interface UpdateOrganizationBody { name?:string; address?:string|null; location?:string|null; isActive?:boolean; }
type Result<T>={value:T}|{error:string};
export function validateOrganizationBody(req:Request,mode:"create"|"update"):Result<CreateOrganizationBody|UpdateOrganizationBody>{
 if(typeof req.body!=="object"||req.body===null||Array.isArray(req.body))return {error:"Request body must be a JSON object."};
 const b=req.body as Record<string,unknown>; const allowed=mode==="create"?["name","address","location","ownerName","ownerEmail"]:["name","address","location","isActive"];
 for(const k of Object.keys(b))if(!allowed.includes(k))return {error:`Unsupported field: ${k}`};
 const out:Record<string,unknown>={};
 if(mode==="create"||b.name!==undefined){if(typeof b.name!=="string"||!b.name.trim())return {error:"Organization name is required."};if(b.name.trim().length>150)return {error:"Organization name must be 150 characters or fewer."};out.name=b.name.trim();}
 for(const k of ["address","location"]){const v=b[k];if(v!==undefined){if(v!==null&&typeof v!=="string")return {error:`${k} must be a string.`};if(typeof v==="string"&&v.trim().length>500)return {error:`${k} must be 500 characters or fewer.`};out[k]=typeof v==="string"?(v.trim()||null):v;}}
 if(mode==="create"){
  if(typeof b.ownerName!=="string"||!b.ownerName.trim())return {error:"Owner name is required."};if(b.ownerName.trim().length>150)return {error:"Owner name must be 150 characters or fewer."};
  if(typeof b.ownerEmail!=="string"||b.ownerEmail.trim().length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.ownerEmail.trim()))return {error:"A valid owner email is required."};
  out.ownerName=b.ownerName.trim();out.ownerEmail=b.ownerEmail.trim().toLowerCase();return {value:out as unknown as CreateOrganizationBody};
 }
 if(b.isActive!==undefined){if(typeof b.isActive!=="boolean")return {error:"isActive must be a boolean."};out.isActive=b.isActive;}
 if(!Object.keys(out).length)return {error:"Provide at least one field to update."};return {value:out as UpdateOrganizationBody};
}
export function parsePositiveInteger(v:unknown,defaultValue?:number):number|null{if(v===undefined&&defaultValue!==undefined)return defaultValue;if(typeof v==="string"&&!/^[1-9]\d*$/.test(v))return null;const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null;}
export function isUuid(v: unknown): v is string { return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
