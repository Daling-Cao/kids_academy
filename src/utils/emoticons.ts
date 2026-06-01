const EMOTICON_MAP: [RegExp, string][] = [
  [/:-\)/g, '😊'], [/:  \)/g, '😊'], [/:\)/g, '😊'],
  [/:-D/g, '😄'], [/:D/g, '😄'],
  [/:-\(/g, '😢'], [/:\(/g, '😢'],
  [/;-\)/g, '😉'], [/;\)/g, '😉'],
  [/:-P/gi, '😛'], [/:P/gi, '😛'],
  [/:-O/gi, '😲'], [/:O/gi, '😲'],
  [/:-\|/g, '😐'], [/:\|/g, '😐'],
  [/<3/g, '❤️'],
  [/:\*/g, '😘'],
  [/XD/g, '😆'],
  [/B-\)/g, '😎'], [/B\)/g, '😎'],
  [/:\//g, '😕'],
  [/>\.</g, '😤'],
  [/\^_\^/g, '😊'],
  [/\^-\^/g, '😊'],
  [/o_O/gi, '😳'],
  [/T_T/g, '😭'], [/T\.T/g, '😭'],
];

export function convertEmoticons(text: string): string {
  let result = text;
  for (const [pattern, emoji] of EMOTICON_MAP) {
    result = result.replace(pattern, emoji);
  }
  return result;
}
