/**
 * Ensures branch/location Combobox lists include an "all branches" row when the
 * server list does not already contain `id: '__all__'`.
 */
export function withAllBranchesOptions(
  options: Array<{ id: string; name: string }>,
  allLabel = 'All Branches'
): Array<{ id: string; name: string }> {
  if (options.some((o) => o.id === '__all__')) {
    return options;
  }
  return [{ id: '__all__', name: allLabel }, ...options];
}
