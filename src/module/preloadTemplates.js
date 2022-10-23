export async function preloadTemplates() {
  const templatePaths = [
    // Add paths to "modules/roll-table-importer/templates"
  ];

  return loadTemplates(templatePaths);
}
