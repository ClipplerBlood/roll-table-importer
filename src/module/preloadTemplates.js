export async function preloadTemplates() {
  const templatePaths = [
    // Add paths to "modules/roll-table-importer/templates"
    'modules/roll-table-importer/templates/roll-table-config.html',
  ];

  return loadTemplates(templatePaths);
}
