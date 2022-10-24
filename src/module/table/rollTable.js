import { i18n, stringInject } from '../utils.js';

export class RTITable extends RollTable {
  async draw({ roll, recursive = true, results = [], displayChat = true, rollMode } = {}) {
    const draw = await super.draw({ roll, recursive, results, displayChat: false, rollMode });
    let newResults = [];

    for (let i = 0; i < draw.results.length; i++) {
      const r = draw.results[i];
      const qtFormula = r.flags['roll-table-importer']?.qtFormula?.trim();
      if (qtFormula == null || qtFormula === '' || qtFormula === '1') {
        newResults.push(r);
      } else {
        const qtRoll = Roll.create(qtFormula);
        const qt = (await qtRoll.evaluate({ async: true })).total;
        console.log(qt);
        newResults = newResults.concat(Array(qt).fill(r));
      }
    }
    draw.results = newResults;
    console.log(draw);

    // Forward drawn results to create chat messages
    if (displayChat) {
      await this.toMessage(draw.results, {
        roll: roll,
        messageOptions: { rollMode },
      });
    }

    // If flag is on, auto import
    if (this.flags['roll-table-importer']?.enabled) await this.addResultsToControlledTokens(draw.results);
    console.log(draw.results);
    return draw;
  }

  async addResultsToControlledTokens(results) {
    // Grab the items
    let itemsData = await this.resultsToItemsData(results);
    if (itemsData.length === 0) return;
    itemsData = this.preStackItems(itemsData);

    // Grab the actors
    const controlledActors = canvas.tokens.controlled.map((t) => t.actor).filter((a) => a.isOwner);
    if (controlledActors.length === 0) return;

    // Add the items
    for (const actor of controlledActors) {
      await this.addItemsToActor(actor, itemsData);
    }

    // Notify the user of items added
    let itemNames = itemsData
      .map((i) => {
        if (!this.itemStackAttribute) return i.name;
        const stack = parseInt(getProperty(i.system, this.itemStackAttribute));
        if (stack <= 1) return i.name;
        return `${stack} ${i.name}`;
      })
      .join(', ');
    const actorNames = controlledActors.map((a) => a.name).join(', ');
    const infoStr = stringInject(i18n('RTI.importSuccess'), [itemNames, actorNames]);
    ui.notifications.info(infoStr);
  }

  /**
   * Converts a list of results into a list of item data
   * @param {TableResult[]}results
   * @return {Object[]} array of item data
   */
  async resultsToItemsData(results) {
    const itemsData = [];
    for (const r of results) {
      if (!r.documentId) continue;
      const collection = game.collections.get(r.documentCollection) ?? game.packs.get(r.documentCollection);
      let document = (await collection?.get(r.documentId)) ?? (await collection?.getDocument(r.documentId));
      if (document instanceof Item) itemsData.push(document.toObject());
    }
    return itemsData;
  }

  /**
   * Preemptively stacks all items in the itemsData, if possible
   * @param itemsData
   * @return {*[]|*}
   */
  preStackItems(itemsData) {
    const stackAttribute = this.itemStackAttribute;
    if (stackAttribute == null) return itemsData;
    const stackedItemsData = [];
    for (const item of itemsData) {
      const match = stackedItemsData.find((i) => this.itemMatches(i, item));
      if (!match) {
        stackedItemsData.push(item);
      } else {
        const newStack = getProperty(match.system, stackAttribute) + (getProperty(item.system, stackAttribute) ?? 1);
        setProperty(match, `system.${stackAttribute}`, newStack);
      }
    }
    return stackedItemsData;
  }

  /**
   * Adds the Items item to an actor, stacking them if possible
   * @param {Actor} actor
   * @param {Object[]} itemsData
   * @returns {Promise<itemsData>}
   */
  async addItemsToActor(actor, itemsData) {
    const stackAttribute = this.itemStackAttribute;
    if (stackAttribute == null) return Item.create(itemsData, { parent: actor });
    for (const item of itemsData) {
      const match = actor.items.find((i) => this.itemMatches(i, item));
      if (match) {
        const newStack = getProperty(match.system, stackAttribute) + (getProperty(item.system, stackAttribute) ?? 1);
        await match.update({
          [`system.${stackAttribute}`]: newStack,
        });
      } else {
        Item.create(itemsData, { parent: actor });
      }
    }
  }

  itemMatches(charItem, tableItem) {
    if (charItem.name !== tableItem.name) return false;

    const flattenChar = flattenObject(charItem.system);
    const flattenTable = flattenObject(tableItem.system);

    for (const k of Object.keys(tableItem)) {
      if (flattenChar[k] == null || flattenTable[k] == null) continue;
      const isBlacklisted = this.matchAttributesBlacklist.find((b) => k.startsWith(b));
      if (isBlacklisted != null) continue;
      if (flattenChar[k] !== flattenTable[k]) {
        console.log(flattenChar[k], k);
        return false;
      }
    }
    return true;
  }

  get systemConfig() {
    return game.rti.systemConfig[game.system.id];
  }

  get itemStackAttribute() {
    return this.systemConfig?.itemStackAttribute;
  }

  get matchAttributesBlacklist() {
    return this.systemConfig?.matchAttributesBlacklist;
  }
}
