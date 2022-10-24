import { registerSettings } from './settings.js';
import { DEFAULT_SYSTEM_CONFIG } from './systems.js';
import { RTITable } from './table/rollTable.js';
import { RTITableConfig } from './table/rollTableConfig.js';

// Initialize module
Hooks.once('init', async () => {
  console.log('roll-table-importer | Initializing roll-table-importer');
  game.rti = {
    systemConfig: DEFAULT_SYSTEM_CONFIG,
  };

  CONFIG.RollTable.documentClass = RTITable;
  RollTables.registerSheet('roll-table-importer', RTITableConfig, { makeDefault: true });
  registerSettings();
});

Hooks.once('setup', async () => {});

Hooks.once('ready', async () => {});

function injectRightClickContentLink(appElement) {
  const contentLinks = appElement.find('.content-link[data-type="RollTable"]');
  contentLinks.mousedown(async (ev) => {
    if (ev.which !== 3) return;
    const tableUuid = ev.currentTarget.dataset.uuid;
    if (!tableUuid) return;
    const tableDocument = await fromUuid(tableUuid);
    const roll = await tableDocument.roll();
    await tableDocument?.draw({
      roll: roll.roll,
      results: roll.results,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  });
}

Hooks.on('renderItemSheet', (_app, element, _options) => injectRightClickContentLink(element));
Hooks.on('renderActorSheet', (_app, element, _options) => injectRightClickContentLink(element));
