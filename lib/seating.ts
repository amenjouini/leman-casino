/** Display label of a table: owner-defined name, or "Table N". */
export function tableLabel(labels: string[], table: number) {
  return labels[table - 1]?.trim() || `Table ${table}`;
}
