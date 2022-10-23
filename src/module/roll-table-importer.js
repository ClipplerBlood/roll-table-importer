import { registerSettings } from './settings.js';
import { i18n, stringInject } from './utils.js';
import { DEFAULT_SYSTEM_CONFIG } from './systems.js';

// Initialize module
Hooks.once('init', async () => {
  game.rti = {
    systemConfig: DEFAULT_SYSTEM_CONFIG,
  };
  console.log('roll-table-importer | Initializing roll-table-importer');
  registerSettings();
});

Hooks.once('setup', async () => {});

Hooks.once('ready', async () => {});

// Listening for rolled table results
Hooks.on('createChatMessage', async (message, options, userId) => {
  // Check if the message is from a table
  const isFromTable = message.getFlag('core', 'RollTable');
  if (!isFromTable || userId !== game.userId) return;

  // Get all controlled & owned token actors
  const controlledActors = canvas.tokens.controlled.map((t) => t.actor).filter((a) => a.isOwner);
  if (controlledActors.length === 0) return;

  // Enrich the content so that data can be grabbed
  const enrichedContent = await TextEditor.enrichHTML(message.content, {
    async: true,
    rollData: message.getRollData(),
  });

  // Grab the data
  const itemsUuid = $(enrichedContent)
    .find('.table-results [data-uuid]')
    .map((_, el) => el.dataset.uuid);

  const itemsData = [];
  for (const uuid of itemsUuid) {
    const item = await fromUuid(uuid);
    if (item) itemsData.push(item.toObject());
  }

  // If items are present, add them to actors
  if (itemsData.length === 0) return;
  for (const actor of controlledActors) {
    await addItemsToActor(actor, itemsData);
  }

  // Notify the user of items added
  const itemNames = itemsData.map((i) => i.name).join(', ');
  const actorNames = controlledActors.map((a) => a.name).join(', ');
  const infoStr = stringInject(i18n('RTI.importSuccess'), [itemNames, actorNames]);
  ui.notifications.info(infoStr);
});

// Inject custom option in the table sheet
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

/**
 * Adds the Items item to an actor, stacking them if possible
 * @param {Actor} actor
 * @param {Object[]} itemsData
 * @returns {Promise<itemsData>}
 */

async function addItemsToActor(actor, itemsData) {
  const systemConfig = game.rti.systemConfig[game.system.id];
  const stackAttribute = systemConfig?.itemStackAttribute;
  if (stackAttribute == null) return Item.create(itemsData, { parent: actor });
  console.log(itemsData);

  function itemMatches(charItem, tableItem) {
    console.log(charItem.system, tableItem.system);
    if (charItem.name !== tableItem.name) return false;

    const flattenChar = flattenObject(charItem);
    const flattenTable = flattenObject(tableItem);

    for (const k of Object.keys(tableItem)) {
      if (flattenChar[k] == null || flattenTable[k] == null) continue;
      if (game.rti.systemConfig.matchAttributesBlacklist.includes(k)) continue;
      if (flattenChar[k] !== flattenTable[k]) {
        console.log(flattenChar[k], k);
        return false;
      }
    }
    return true;
  }

  for (const item of itemsData) {
    const match = actor.items.find((i) => itemMatches(i, item));
    console.log(match);
    if (match) {
      await match.update({ [`system.${stackAttribute}`]: getProperty(match.system, stackAttribute) + 1 });
    } else {
      Item.create(itemsData, { parent: actor });
    }
  }
}
