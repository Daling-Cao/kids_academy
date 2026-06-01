export const EMOTICON_SHORTCUTS: { shortcut: string; emoji: string }[] = [
  { shortcut: ':)', emoji: '😊' },
  { shortcut: ':D', emoji: '😄' },
  { shortcut: ':(', emoji: '😢' },
  { shortcut: ';)', emoji: '😉' },
  { shortcut: ':P', emoji: '😛' },
  { shortcut: ':O', emoji: '😲' },
  { shortcut: ':|', emoji: '😐' },
  { shortcut: '<3', emoji: '❤️' },
  { shortcut: ':*', emoji: '😘' },
  { shortcut: 'XD', emoji: '😆' },
  { shortcut: 'B)', emoji: '😎' },
  { shortcut: ':/', emoji: '😕' },
  { shortcut: '>.<', emoji: '😤' },
  { shortcut: '^_^', emoji: '😊' },
  { shortcut: 'o_O', emoji: '😳' },
  { shortcut: 'T_T', emoji: '😭' },
];

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
