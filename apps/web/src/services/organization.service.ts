import api from "../api/axios";
import type {CreateOrganizationData,Organization,OrganizationListResult,UpdateOrganizationData} from "../types/organization";
const organizationService={
 async list(params:{page?:number;limit?:number;search?:string}={}):Promise<OrganizationListResult>{const r=await api.get("/organization",{params});return {data:r.data.data,pagination:r.data.pagination};},
 async create(data:CreateOrganizationData):Promise<{data:Organization;message:string}>{const r=await api.post("/organization",data);return {data:r.data.data,message:r.data.message};},
 async get(id:string){const r=await api.get(`/organization/${id}`);return r.data.data;},
 async update(id:string,data:UpdateOrganizationData):Promise<Organization>{const r=await api.put(`/organization/${id}`,data);return r.data.data;},
 async updateStatus(id:string,isActive:boolean):Promise<Organization>{const r=await api.patch(`/organization/${id}/status`,{isActive});return r.data.data;}
};export default organizationService;
