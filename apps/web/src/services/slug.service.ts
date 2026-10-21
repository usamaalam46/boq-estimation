const slugService = {
  generate(value: string): string {
    return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  },
};
export default slugService;
