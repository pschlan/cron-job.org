export function intersperse(items, separator) {
  return items.reduce((previous, current, index) =>
      previous.concat((index === items.length - 1 ? [current] : [current, separator])),
    []);
}
