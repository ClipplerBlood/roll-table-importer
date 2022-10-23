import { registerSettings } from './settings.js';
import { preloadTemplates } from './preloadTemplates.js';
import { i18n, stringInject } from './utils.js';

// Initialize module
Hooks.once('init', async () => {
  console.log('roll-table-importer | Initializing roll-table-importer');
  registerSettings();
  await preloadTemplates();
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
    await Item.create(itemsData, { parent: actor });
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
