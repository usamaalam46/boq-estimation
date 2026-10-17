export type OrganizationStatus = "Active" | "Pending" | "Inactive";

export type Organization = {
  id: number;
  name: string;
  slug: string;
  admin: string;
  email: string;
  projects: number;
  status: OrganizationStatus;
  createdAt: string;
};

export type OrganizationFormValues = {
  name: string;
  slug: string;
  adminName: string;
  email: string;
};
