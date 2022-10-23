export function i18n(x) {
  return game.i18n.localize(x);
}

export function stringInject(str, arr) {
  if (typeof str !== 'string' || !(arr instanceof Array)) {
    return false;
  }

  return str.replace(/({\d})/g, function (i) {
    return arr[i.replace(/{/, '').replace(/}/, '')];
  });
}
