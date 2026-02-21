/**
 * Generate a URL-safe slug from a form name.
 * Lowercase, replace non-alphanumeric with hyphens, collapse multiples, trim edges.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/**
 * Generate a unique slug for a form template within an org.
 * Appends a numeric suffix if the base slug already exists.
 */
export async function generateUniqueSlug(
  supabase: any,
  orgId: string,
  name: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(name);

  // Check if base slug is available
  let query = supabase
    .from('form_templates')
    .select('id')
    .eq('org_id', orgId)
    .eq('slug', baseSlug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existing } = await query;

  if (!existing || existing.length === 0) {
    return baseSlug;
  }

  // Find next available suffix
  let counter = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${counter}`;

    let checkQuery = supabase
      .from('form_templates')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', candidateSlug);

    if (excludeId) {
      checkQuery = checkQuery.neq('id', excludeId);
    }

    const { data: check } = await checkQuery;

    if (!check || check.length === 0) {
      return candidateSlug;
    }
    counter++;
  }
}
