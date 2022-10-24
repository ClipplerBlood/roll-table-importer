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

    return draw;
  }
}
