// Zero-dependency ANSI color support.
// Respects NO_COLOR (https://no-color.org) and non-TTY output.

const enabled = process.stdout.isTTY && !process.env.NO_COLOR;

const code = (open, close) => enabled
  ? (s) => `\x1b[${open}m${s}\x1b[${close}m`
  : (s) => s;

export const bold = code(1, 22);
export const dim = code(90, 39);
export const cyan = code(36, 39);
export const green = code(32, 39);
export const yellow = code(33, 39);
export const red = code(31, 39);
export const bgWhite = code(47, 49);
export const bgGray = code(100, 49);

// 256-color helper
const bg256 = (bg, fg) => enabled
  ? (s) => `\x1b[48;5;${bg};38;5;${fg}m${s}\x1b[0m`
  : (s) => s;

const pawBg = bg256(253, 232);
const w1 = bg256(239, 255);
const w2 = bg256(66, 255);
const w3 = bg256(72, 232);

export function printLogo() {
  console.log(`
  ${pawBg('         ')}${w1(`  ${bold('╔═╗')}        `)}${w2(`  ${bold('╔═╗')}       `)}${w3(`  ${bold('╦ ╦')}         `)}
  ${pawBg('   🐾    ')}${w1(`  ${bold('╠═╝')} hased  `)}${w2(`  ${bold('╠═╣')} gent  `)}${w3(`  ${bold('║║║')} orkflow `)}
  ${pawBg('         ')}${w1(`  ${bold('╩')}          `)}${w2(`  ${bold('╩ ╩')}       `)}${w3(`  ${bold('╚╩╝')}         `)}
`);
}
