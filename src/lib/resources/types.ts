export const CUSTOM_RESOURCE_TYPE = "__custom__";

export const RESOURCE_TYPES = [
  "Rooms & Spaces",
  "IT & Electronics",
  "Office Equipment",
  "Workstations",
  "Media & Creative Equipment",
  "Vehicles & Transportation",
  "Facilities & Amenities",
  "Tools & Specialized Equipment",
] as const;

export function isStandardResourceType(value: string) {
  return RESOURCE_TYPES.some((type) => type === value);
}
