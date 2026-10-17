import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Place this file at prisma/seed-organizations-demo.ts.
// This script keeps the existing Super Admin and role/permission seed intact.
// All rates are illustrative demo values in PKR, not verified market rates.

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const organizations = [
  {
    name: "Ali Power Engineering Systems",
    slug: "ali-power-engineering-systems",
    address: "F-10 Markaz, Islamabad",
    location: "Islamabad, Pakistan",
    ownerName: "Syed Awais Ahmed",
    ownerEmail: "awais.owner@ali-power.com",
    ownerPasswordEnv: "test123456",
    disciplines: ["MECH", "ELEC", "CIVIL", "ELEC-TECH", "MECHATRONICS"],
    projectName: "Commercial Building MEP Works",
    projectCode: "APES-DEMO-001",
    estimateName: "Mechanical Piping and Supports Estimate",
    estimateReference: "APES-EST-001",
    estimateDescription: "Illustrative demo estimate for mechanical piping and support work.",
    lines: [
      { disciplineCode: "MECH", categoryName: "Pipes", itemCode: "MECH-PIPE-CS-100", itemName: "Carbon steel pipe, 100 mm", unitSymbol: "m", quantity: "120", rate: "4850", wastage: "3" },
      { disciplineCode: "MECH", categoryName: "Fittings", itemCode: "MECH-ELBOW-100", itemName: "Carbon steel elbow, 100 mm", unitSymbol: "pcs", quantity: "18", rate: "2200", wastage: "2" },
      { disciplineCode: "MECH", categoryName: "Supports", itemCode: "MECH-SUPPORT-MED", itemName: "Pipe support assembly, medium duty", unitSymbol: "pcs", quantity: "30", rate: "1850", wastage: "2" },
    ],
  },
  {
    name: "Ameer Alam Builder & Civil Contractor",
    slug: "ameer-alam-builder-civil-contractor",
    address: "I-14, Islamabad",
    location: "Islamabad, Pakistan",
    ownerName: "Ameer Alam",
    ownerEmail: "ameer.owner@ameer-alam.com",
    ownerPasswordEnv: "test123456",
    disciplines: ["CIVIL"],
    projectName: "Residential Construction Demo",
    projectCode: "AABC-DEMO-001",
    estimateName: "Concrete and Excavation Estimate",
    estimateReference: "AABC-EST-001",
    estimateDescription: "Illustrative demo estimate for excavation and concrete works.",
    lines: [
      { disciplineCode: "CIVIL", categoryName: "Earthwork", itemCode: "CIVIL-EXCAVATION", itemName: "Excavation in ordinary soil", unitSymbol: "m3", quantity: "85", rate: "1200", wastage: "0" },
      { disciplineCode: "CIVIL", categoryName: "Concrete", itemCode: "CIVIL-CONC-1-2-4", itemName: "Plain cement concrete 1:2:4", unitSymbol: "m3", quantity: "32", rate: "18500", wastage: "2" },
      { disciplineCode: "CIVIL", categoryName: "Reinforcement", itemCode: "CIVIL-REBAR", itemName: "Reinforcement steel supply and fixing", unitSymbol: "kg", quantity: "2400", rate: "295", wastage: "3" },
    ],
  },
  {
    name: "Saad Trading and Construction Company",
    slug: "saad-trading-construction-company",
    address: "G-11, Islamabad",
    location: "Islamabad, Pakistan",
    ownerName: "Hafiz Qadeer Ahmed",
    ownerEmail: "qadeer.owner@saad-trading.com",
    ownerPasswordEnv: "test123456",
    disciplines: ["CIVIL"],
    projectName: "Building Materials Supply Demo",
    projectCode: "STCC-DEMO-001",
    estimateName: "Materials Supply BOQ",
    estimateReference: "STCC-EST-001",
    estimateDescription: "Illustrative demo estimate for supply of common construction materials.",
    lines: [
      { disciplineCode: "CIVIL", categoryName: "Cement", itemCode: "CIVIL-CEMENT-BAG", itemName: "Ordinary Portland cement, 50 kg bag", unitSymbol: "bag", quantity: "500", rate: "1450", wastage: "0" },
      { disciplineCode: "CIVIL", categoryName: "Aggregates", itemCode: "CIVIL-SAND", itemName: "Construction sand", unitSymbol: "m3", quantity: "45", rate: "4200", wastage: "0" },
      { disciplineCode: "CIVIL", categoryName: "Aggregates", itemCode: "CIVIL-CRUSH", itemName: "Crushed aggregate, 19 mm", unitSymbol: "m3", quantity: "35", rate: "5600", wastage: "0" },
    ],
  },
] as const;

const disciplineSeeds = [
  { code: "MECH", name: "Mechanical", description: "Mechanical piping, HVAC, equipment, and supports." },
  { code: "ELEC", name: "Electrical", description: "Electrical cabling, containment, and accessories." },
  { code: "CIVIL", name: "Civil", description: "Earthworks, concrete, steel, and building materials." },
  { code: "ELEC-TECH", name: "Electronics", description: "Electronic systems, controls, and instrumentation." },
  { code: "MECHATRONICS", name: "Mechatronics", description: "Integrated mechanical, electrical, and control systems." },
];

const unitSeeds = [
  { name: "Metre", symbol: "m", description: "Length in metres.", dimension: "length" },
  { name: "Millimetre", symbol: "mm", description: "Length in millimetres.", dimension: "length" },
  { name: "Square metre", symbol: "m2", description: "Area in square metres.", dimension: "area" },
  { name: "Cubic metre", symbol: "m3", description: "Volume in cubic metres.", dimension: "volume" },
  { name: "Kilogram", symbol: "kg", description: "Mass in kilograms.", dimension: "mass" },
  { name: "Tonne", symbol: "tonne", description: "Mass in metric tonnes.", dimension: "mass" },
  { name: "Piece", symbol: "pcs", description: "Individual pieces.", dimension: "count" },
  { name: "Bag", symbol: "bag", description: "One bag of material.", dimension: "count" },
  { name: "Set", symbol: "set", description: "A complete set.", dimension: "count" },
  { name: "Hour", symbol: "hr", description: "Labour or equipment hour.", dimension: "time" },
];

const categoriesByDiscipline: Record<string, string[]> = {
  MECH: ["Pipes", "Fittings", "Valves", "Supports", "HVAC Equipment"],
  ELEC: ["Cables", "Conduits and Trays", "Switchgear", "Accessories"],
  CIVIL: ["Earthwork", "Concrete", "Reinforcement", "Cement", "Aggregates", "Masonry", "Finishes"],
  "ELEC-TECH": ["Sensors", "Control Panels", "Instrumentation", "Electronic Components"],
  MECHATRONICS: ["Automation Equipment", "Actuators", "Control Systems", "Integrated Assemblies"],
};

const organizationRoleSeeds = [
  {
    name: "Owner", code: "owner", description: "Full control of this organization.",
    permissionCodes: ["organization.dashboard.view", "organization.members.view", "organization.members.manage", "organization.roles.manage", "projects.view", "projects.create", "projects.edit", "projects.delete", "estimates.view", "estimates.create", "estimates.edit", "estimates.delete", "estimates.submit", "estimates.approve", "catalogue.view", "catalogue.manage", "reports.view", "reports.export"],
  },
  {
    name: "Admin", code: "admin", description: "Manages members and day-to-day organization work.",
    permissionCodes: ["organization.dashboard.view", "organization.members.view", "organization.members.manage", "organization.roles.manage", "projects.view", "projects.create", "projects.edit", "projects.delete", "estimates.view", "estimates.create", "estimates.edit", "estimates.delete", "estimates.submit", "estimates.approve", "catalogue.view", "catalogue.manage", "reports.view", "reports.export"],
  },
  {
    name: "Estimator", code: "estimator", description: "Creates and updates estimates.",
    permissionCodes: ["organization.dashboard.view", "projects.view", "projects.create", "projects.edit", "estimates.view", "estimates.create", "estimates.edit", "estimates.submit", "catalogue.view", "reports.view", "reports.export"],
  },
  {
    name: "Viewer", code: "viewer", description: "Read-only access to organization projects and estimates.",
    permissionCodes: ["organization.dashboard.view", "projects.view", "estimates.view", "catalogue.view", "reports.view"],
  },
] as const;

function decimal(value: string) {
  return value;
}

async function ensureOrganizationRole(organizationId: string, seed: typeof organizationRoleSeeds[number]) {
  const existing = await prisma.role.findFirst({ where: { organizationId, code: seed.code } });
  const role = existing
    ? await prisma.role.update({ where: { id: existing.id }, data: { name: seed.name, description: seed.description, scope: "organization", isSystem: true, isActive: true } })
    : await prisma.role.create({ data: { organizationId, name: seed.name, code: seed.code, description: seed.description, scope: "organization", isSystem: true, isActive: true } });

  for (const code of seed.permissionCodes) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission) throw new Error(`Permission '${code}' is missing. Run the roles/permissions seed first.`);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  return role;
}

async function ensureCategory(disciplineId: string, name: string, sortOrder: number) {
  const existing = await prisma.category.findFirst({ where: { disciplineId, parentId: null, name } });
  if (existing) return existing;
  return prisma.category.create({ data: { disciplineId, name, sortOrder, isActive: true } });
}

async function ensureCatalogueItem(args: {
  disciplineId: string; categoryId: string; unitId: string; code: string; name: string; description: string;
}) {
  const existing = await prisma.catalogueItem.findFirst({
    where: { scope: "platform", organizationId: null, code: args.code },
  });
  if (existing) {
    return prisma.catalogueItem.update({
      where: { id: existing.id },
      data: { name: args.name, description: args.description, disciplineId: args.disciplineId, categoryId: args.categoryId, unitId: args.unitId, isActive: true },
    });
  }
  return prisma.catalogueItem.create({
    data: { scope: "platform", organizationId: null, ...args, specification: undefined, defaultWastagePercent: "0" },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env.");
  const demoPassword = process.env.DEMO_OWNER_PASSWORD;
  if (!demoPassword || demoPassword.length < 10) {
    throw new Error("Set DEMO_OWNER_PASSWORD in .env to a demo password of at least 10 characters.");
  }
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // Seed globally shared engineering foundations.
  const disciplineByCode = new Map<string, { id: string }>();
  for (const seed of disciplineSeeds) {
    const discipline = await prisma.discipline.upsert({
      where: { code: seed.code },
      update: { name: seed.name, description: seed.description, isActive: true },
      create: { ...seed, isActive: true },
    });
    disciplineByCode.set(seed.code, discipline);
  }

  const unitBySymbol = new Map<string, { id: string }>();
  for (const seed of unitSeeds) {
    const unit = await prisma.unit.upsert({
      where: { symbol: seed.symbol },
      update: { name: seed.name, description: seed.description, dimension: seed.dimension, isActive: true },
      create: { ...seed, isActive: true },
    });
    unitBySymbol.set(seed.symbol, unit);
  }

  const categoryIds = new Map<string, string>();
  for (const [disciplineCode, categoryNames] of Object.entries(categoriesByDiscipline)) {
    const discipline = disciplineByCode.get(disciplineCode);
    if (!discipline) throw new Error(`Missing discipline ${disciplineCode}`);
    for (let i = 0; i < categoryNames.length; i++) {
      const category = await ensureCategory(discipline.id, categoryNames[i], i + 1);
      categoryIds.set(`${disciplineCode}:${categoryNames[i]}`, category.id);
    }
  }

  // Shared platform catalogue. Rates live on estimate items in this schema, so
  // this seed only creates reusable item definitions, not price lists.
  const catalogueSeeds = [
    { disciplineCode: "MECH", categoryName: "Pipes", code: "MECH-PIPE-CS-100", name: "Carbon steel pipe, 100 mm", description: "Illustrative specification; verify schedule and grade per project.", unitSymbol: "m" },
    { disciplineCode: "MECH", categoryName: "Fittings", code: "MECH-ELBOW-100", name: "Carbon steel elbow, 100 mm", description: "Illustrative fitting item; confirm pressure rating and material.", unitSymbol: "pcs" },
    { disciplineCode: "MECH", categoryName: "Supports", code: "MECH-SUPPORT-MED", name: "Pipe support assembly, medium duty", description: "Illustrative pipe support assembly.", unitSymbol: "pcs" },
    { disciplineCode: "CIVIL", categoryName: "Earthwork", code: "CIVIL-EXCAVATION", name: "Excavation in ordinary soil", description: "Measurement and disposal requirements to be project-defined.", unitSymbol: "m3" },
    { disciplineCode: "CIVIL", categoryName: "Concrete", code: "CIVIL-CONC-1-2-4", name: "Plain cement concrete 1:2:4", description: "Nominal mix shown for demo only; follow project specification.", unitSymbol: "m3" },
    { disciplineCode: "CIVIL", categoryName: "Reinforcement", code: "CIVIL-REBAR", name: "Reinforcement steel supply and fixing", description: "Grade, diameter, laps, and wastage to be specified per project.", unitSymbol: "kg" },
    { disciplineCode: "CIVIL", categoryName: "Cement", code: "CIVIL-CEMENT-BAG", name: "Ordinary Portland cement, 50 kg bag", description: "Demo catalogue item; confirm applicable standard and brand.", unitSymbol: "bag" },
    { disciplineCode: "CIVIL", categoryName: "Aggregates", code: "CIVIL-SAND", name: "Construction sand", description: "Quality and grading to be specified by project.", unitSymbol: "m3" },
    { disciplineCode: "CIVIL", categoryName: "Aggregates", code: "CIVIL-CRUSH", name: "Crushed aggregate, 19 mm", description: "Quality and grading to be specified by project.", unitSymbol: "m3" },
  ];

  const catalogueByCode = new Map<string, { id: string; unitId: string; unitSymbol: string; name: string }>();
  for (const item of catalogueSeeds) {
    const discipline = disciplineByCode.get(item.disciplineCode)!;
    const categoryId = categoryIds.get(`${item.disciplineCode}:${item.categoryName}`);
    const unit = unitBySymbol.get(item.unitSymbol);
    if (!categoryId || !unit) throw new Error(`Missing category or unit for catalogue item ${item.code}`);
    const saved = await ensureCatalogueItem({ disciplineId: discipline.id, categoryId, unitId: unit.id, code: item.code, name: item.name, description: item.description });
    catalogueByCode.set(item.code, { id: saved.id, unitId: unit.id, unitSymbol: item.unitSymbol, name: item.name });
  }

  let orgCount = 0;
  let ownerCount = 0;
  let projectCount = 0;
  let estimateCount = 0;

  for (const seed of organizations) {
    const organization = await prisma.organization.upsert({
      where: { slug: seed.slug },
      update: { name: seed.name, address: seed.address, location: seed.location, isActive: true },
      create: { name: seed.name, slug: seed.slug, address: seed.address, location: seed.location, isActive: true },
    });
    orgCount++;

    const owner = await prisma.user.upsert({
      where: { email: seed.ownerEmail },
      update: { name: seed.ownerName, isActive: true },
      create: { name: seed.ownerName, email: seed.ownerEmail, passwordHash, isActive: true },
    });
    ownerCount++;

    // Each organization gets its own role records and permission mappings.
    const rolesByCode = new Map<string, { id: string }>();
    for (const roleSeed of organizationRoleSeeds) {
      const role = await ensureOrganizationRole(organization.id, roleSeed);
      rolesByCode.set(roleSeed.code, role);
    }

    const ownerRole = rolesByCode.get("owner");
    if (!ownerRole) throw new Error(`Owner role missing for ${seed.name}`);
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: owner.id } },
      update: { roleId: ownerRole.id },
      create: { organizationId: organization.id, userId: owner.id, roleId: ownerRole.id },
    });

    // Seed a single demo project and estimate per organization.
    const project = await prisma.project.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: seed.projectCode } },
      update: { name: seed.projectName, description: "Seeded demonstration project; sample data only." },
      create: { organizationId: organization.id, name: seed.projectName, code: seed.projectCode, description: "Seeded demonstration project; sample data only." },
    });
    projectCount++;

    const existingEstimate = await prisma.estimate.findFirst({ where: { projectId: project.id, reference: seed.estimateReference } });
    const estimate = existingEstimate
      ? await prisma.estimate.update({
          where: { id: existingEstimate.id },
          data: { name: seed.estimateName, description: seed.estimateDescription, createdById: owner.id, currency: "PKR", status: "draft" },
        })
      : await prisma.estimate.create({
          data: { projectId: project.id, createdById: owner.id, name: seed.estimateName, reference: seed.estimateReference, description: seed.estimateDescription, currency: "PKR", status: "draft" },
        });
    estimateCount++;

    const sectionName = "Bill of Quantities";
    let section = await prisma.estimateSection.findFirst({ where: { estimateId: estimate.id, name: sectionName } });
    if (!section) {
      section = await prisma.estimateSection.create({ data: { estimateId: estimate.id, name: sectionName, description: "Demo BOQ section", sortOrder: 1 } });
    }

    // Upsert each line by stable item code within the section; the schema has no
    // unique key for this, so findFirst is used to keep reruns from duplicating.
    let subtotal = 0;
    let wastageTotal = 0;
    for (let i = 0; i < seed.lines.length; i++) {
      const line = seed.lines[i];
      const catalogue = catalogueByCode.get(line.itemCode);
      if (!catalogue) throw new Error(`Catalogue item ${line.itemCode} is missing.`);
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      const wastagePercent = Number(line.wastage);
      const baseAmount = quantity * rate;
      const wastageAmount = baseAmount * (wastagePercent / 100);
      const amount = baseAmount + wastageAmount;
      subtotal += baseAmount;
      wastageTotal += wastageAmount;

      const existingLine = await prisma.estimateItem.findFirst({ where: { sectionId: section.id, itemCode: line.itemCode } });
      const data = {
        catalogueItemId: catalogue.id,
        unitId: catalogue.unitId,
        itemCode: line.itemCode,
        description: line.itemName,
        unitSymbol: line.unitSymbol,
        quantity: decimal(line.quantity),
        rate: decimal(line.rate),
        wastagePercent: decimal(line.wastage),
        amount: amount.toFixed(2),
        remarks: "Illustrative demo rate; verify before real use.",
        sortOrder: i + 1,
      };
      if (existingLine) {
        await prisma.estimateItem.update({ where: { id: existingLine.id }, data });
      } else {
        await prisma.estimateItem.create({ data: { ...data, sectionId: section.id } });
      }
    }

    const contingencyPercent = 0;
    const taxPercent = 0;
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        subtotal: subtotal.toFixed(2),
        wastageTotal: wastageTotal.toFixed(2),
        contingencyPercent: String(contingencyPercent),
        contingencyAmount: "0.00",
        taxPercent: String(taxPercent),
        taxAmount: "0.00",
        grandTotal: (subtotal + wastageTotal).toFixed(2),
      },
    });
  }

  console.log("Organization demo seed completed.");
  console.log(`Organizations ensured: ${orgCount}`);
  console.log(`Owner accounts ensured: ${ownerCount}`);
  console.log(`Projects ensured: ${projectCount}`);
  console.log(`Estimates ensured: ${estimateCount}`);
  console.log("Demo owner emails:");
  for (const seed of organizations) console.log(`- ${seed.ownerName}: ${seed.ownerEmail}`);
  console.log("All owner accounts use DEMO_OWNER_PASSWORD from .env; rates are illustrative PKR demo values.");
}

main()
  .catch((error) => {
    console.error("Organization demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
