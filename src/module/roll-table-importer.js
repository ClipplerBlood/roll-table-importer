// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

/**
 * This is your JavaScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 *          you may want to put a (link to a) license or copyright
 *          notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 *           determines how others may use and modify your module.
 */

// Import JavaScript modules
import { registerSettings } from './settings.js';
import { preloadTemplates } from './preloadTemplates.js';
import { i18n, stringInject } from './utils.js';

// Initialize module
Hooks.once('init', async () => {
  console.log('roll-table-importer | Initializing roll-table-importer');
  // Assign custom classes and constants here

  // Register custom module settings
  registerSettings();

  // Preload Handlebars templates
  await preloadTemplates();
  // Register custom sheets (if any)
});

// Setup module
Hooks.once('setup', async () => {
  // Do anything after initialization but before
  // ready
});

// When ready
Hooks.once('ready', async () => {
  // Do anything once the module is ready
  game.tables.get('Ph9j4ps5VG5MTYHT').render(true);
});

// Add any additional hooks if necessary

Hooks.on('createChatMessage', async (message, options, userId) => {
  const isFromTable = message.getFlag('core', 'RollTable');
  if (!isFromTable || userId !== game.userId) return;

  const controlledActors = canvas.tokens.controlled.map((t) => t.actor).filter((a) => a.isOwner);
  if (controlledActors.length === 0) return;

  const enrichedContent = await TextEditor.enrichHTML(message.content, {
    async: true,
    rollData: message.getRollData(),
  });

  const jqContent = $(enrichedContent);
  const itemsUuid = jqContent.find('.table-results [data-uuid]').map((_, el) => el.dataset.uuid);
  const itemsData = [];
  for (const uuid of itemsUuid) {
    const item = await fromUuid(uuid);
    if (item) itemsData.push(item.toObject());
  }

  if (itemsData.length === 0) return;
  for (const actor of controlledActors) {
    await Item.create(itemsData, { parent: actor });
  }

  const itemNames = itemsData.map((i) => i.name).join(', ');
  const actorNames = controlledActors.map((a) => a.name).join(', ');
  const infoStr = stringInject(i18n('RTI.importSuccess'), [itemNames, actorNames]);
  ui.notifications.info(infoStr);
});

Hooks.on('renderRollTableConfig', (app, element, options) => {
  const results = element.find('.results');
  if (!results) {
    console.error('roll-table-importer | Unsupported Table Roll config');
    return;
  }

  const tableDocument = options.document;
  const isEnabled = tableDocument.getFlag('roll-table-importer', 'enabled') ?? false;

  const importerSetting = $(`
    <div class="form-group">
        <label>${i18n('RTI.settingHint')}</label>
        <input type="checkbox" ${isEnabled ? 'checked' : ''}>
    </div>
  `);
  importerSetting.find('input').on('change', function () {
    const checked = this.checked;
    tableDocument.setFlag('roll-table-importer', 'enabled', checked);
  });
  importerSetting.insertBefore(results);
});
