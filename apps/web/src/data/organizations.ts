import type { Organization } from "../types/organization";

export const initialOrganizations: Organization[] = [
  {
    id: 1,
    name: "Apex Engineering",
    slug: "apex-engineering",
    admin: "Ahmed Khan",
    email: "ahmed@example.com",
    projects: 24,
    status: "Active",
    createdAt: "Oct 12, 2026",
  },
  {
    id: 2,
    name: "BuildRight Contractors",
    slug: "buildright-contractors",
    admin: "Sara Malik",
    email: "sara@example.com",
    projects: 18,
    status: "Active",
    createdAt: "Oct 10, 2026",
  },
  {
    id: 3,
    name: "Prime MEP Solutions",
    slug: "prime-mep-solutions",
    admin: "Usman Ali",
    email: "usman@example.com",
    projects: 9,
    status: "Pending",
    createdAt: "Oct 08, 2026",
  },
  {
    id: 4,
    name: "Northstar Construction",
    slug: "northstar-construction",
    admin: "Hassan Raza",
    email: "hassan@example.com",
    projects: 0,
    status: "Inactive",
    createdAt: "Oct 05, 2026",
  },
];
