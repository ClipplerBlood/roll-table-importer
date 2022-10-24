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
