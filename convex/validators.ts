/* eslint-disable prettier/prettier */
// Shared input validators — import these in any mutation that takes user input

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_WORKSPACE_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const VALID_STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export function validateTitle(title: string): string {
  const t = title.trim();
  if (!t) throw new Error("Title is required.");
  if (t.length > MAX_TITLE_LENGTH)
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less.`);
  return t;
}

export function validateDescription(desc: string): string {
  const d = desc.trim();
  if (!d) throw new Error("Description is required.");
  if (d.length > MAX_DESCRIPTION_LENGTH)
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`);
  return d;
}

export function validateWorkspaceName(name: string): string {
  const n = name.trim();
  if (!n) throw new Error("Workspace name is required.");
  if (n.length > MAX_WORKSPACE_NAME_LENGTH)
    throw new Error(`Workspace name must be ${MAX_WORKSPACE_NAME_LENGTH} characters or less.`);
  return n;
}

export function validateEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (!e) throw new Error("Email is required.");
  if (e.length > MAX_EMAIL_LENGTH)
    throw new Error("Email address is too long.");
  // RFC 5322 simplified — catches the vast majority of invalid emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(e))
    throw new Error("Invalid email address format.");
  return e;
}

export function validateStoryPoints(points: number): number {
  const valid = [...VALID_STORY_POINTS];

  if (valid.includes(points as any)) return points;
  if (points <= 0) return 1;
  if (points >=13) return 13;

  return valid.reduce((nearest,candidate) =>
    Math.abs(candidate - points) < Math.abs(nearest - points) ? candidate : nearest);
}
 
export function validateInventoryItems(items?: any[]) {
  if (!items) return [];

  return items.map((item) => {
    if (!item.name.trim()) throw new Error("Inventory item must have a name");
    if (item.quantity <= 0) throw new Error("Quantity must be > 0");
    return item;
  });
}