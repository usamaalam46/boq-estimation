import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import prisma from "../config/prisma.js";
import { EstimatesService } from "../services/estimate.service.js";
import { validateEstimateBody } from "../validators/estimate.validatior.js";

const service = new EstimatesService(prisma);
const parseId = (value: string | undefined) => {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
};
const fail = (res: Response, error: unknown) => {
  const e = error as Error & { status?: number; code?: string };
  const status = e.status ?? (e.code === "P2002" ? 409 : e.code === "P2025" ? 404 : 400);
  return res.status(status).json({ success: false, message: e.code === "P2002" ? "A record with these details already exists." : e.message || "Request failed." });
};
const currentUserId = (req: AuthenticatedRequest) => req.auth?.userId;

export async function indexEstimates(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    const projectId = req.query.projectId === undefined ? undefined : parseId(String(req.query.projectId));
    if (req.query.projectId !== undefined && projectId === null) return res.status(422).json({ success: false, message: "Invalid projectId." });
    const status = req.query.status === undefined ? undefined : String(req.query.status);
    if (status && !["draft", "in_review", "approved", "archived"].includes(status)) return res.status(422).json({ success: false, message: "Invalid estimate status." });
    const data = await service.list(userId, { page, pageSize, search: String(req.query.search ?? "").trim().slice(0, 100), status, projectId: projectId ?? undefined });
    return res.json({ success: true, message: "Estimates retrieved successfully.", data: data.items, pagination: data.pagination });
  } catch (error) { return fail(res, error); }
}

export async function showEstimate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req); const id = parseId(req.params.id);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!id) return res.status(422).json({ success: false, message: "Invalid estimate ID." });
    const data = await service.get(userId, id);
    return res.json({ success: true, message: "Estimate retrieved successfully.", data });
  } catch (error) { return fail(res, error); }
}

export async function createEstimate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    const input = validateEstimateBody(req.body);
    const data = await service.create(userId, input);
    return res.status(201).json({ success: true, message: "Estimate draft created successfully.", data });
  } catch (error) { return fail(res, error); }
}

export async function updateEstimate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req); const id = parseId(req.params.id);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!id) return res.status(422).json({ success: false, message: "Invalid estimate ID." });
    const input = validateEstimateBody(req.body);
    const data = await service.updateDraft(userId, id, input);
    return res.json({ success: true, message: "Estimate updated successfully.", data });
  } catch (error) { return fail(res, error); }
}

export async function deleteEstimate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req); const id = parseId(req.params.id);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!id) return res.status(422).json({ success: false, message: "Invalid estimate ID." });
    const data = await service.remove(userId, id);
    return res.json({ success: true, message: "Draft estimate deleted successfully.", data });
  } catch (error) { return fail(res, error); }
}

export async function duplicateEstimate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = currentUserId(req); const id = parseId(req.params.id);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required." });
    if (!id) return res.status(422).json({ success: false, message: "Invalid estimate ID." });
    const data = await service.duplicate(userId, id);
    return res.status(201).json({ success: true, message: "Estimate duplicated as a draft.", data });
  } catch (error) { return fail(res, error); }
}
