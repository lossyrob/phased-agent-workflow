#!/usr/bin/env node

import { installCommand } from '../lib/commands/install.js';
import { listCommand } from '../lib/commands/list.js';
import { uninstallCommand } from '../lib/commands/uninstall.js';
import { upgradeCommand } from '../lib/commands/upgrade.js';
import { VERSION } from '../lib/version.js';
import { bold, dim, cyan, green, printLogo } from '../lib/color.js';
import { SUPPORTED_TARGETS } from '../lib/paths.js';

function helpText() {
  return `
  ${bold('Usage:')} ${cyan('paw')} <command> [options]

  ${bold('Commands:')}
    ${green('install')} <target>   Install PAW agents and skills
    ${green('upgrade')}            Check for updates and upgrade
    ${green('list')}               Show installed version and components
    ${green('uninstall')} [target]  Remove PAW agents and skills

  ${bold('Options:')}
    ${dim('--help, -h')}         Show this help message
    ${dim('--version, -v')}      Show version number
    ${dim('--force, -f')}        Skip confirmation prompts
    ${dim('--no-banner')}        Suppress the logo banner

  ${bold('Examples:')}
    ${dim('$')} paw install copilot
    ${dim('$')} paw install claude
    ${dim('$')} paw list
    ${dim('$')} paw upgrade
    ${dim('$')} paw uninstall
    ${dim('$')} paw uninstall claude
`;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }

  if (!args.includes('--no-banner')) {
    printLogo();
  }

  const command = args.find(a => !a.startsWith('-'));
  const flags = {
    force: args.includes('--force') || args.includes('-f'),
  };

  if (!command || args.includes('--help') || args.includes('-h')) {
    console.log(helpText());
    process.exit(0);
  }

  try {
    switch (command) {
      case 'install': {
        const target = args.find(a => !a.startsWith('-') && a !== 'install');
        if (!target) {
          console.error(`Error: install requires a target. Supported: ${SUPPORTED_TARGETS.join(', ')}`);
          process.exit(1);
        }
        await installCommand(target, flags);
        break;
      }
      case 'upgrade':
        await upgradeCommand(flags);
        break;
      case 'list':
        await listCommand();
        break;
      case 'uninstall': {
        const uninstallTarget = args.find((a, i) => i > 0 && !a.startsWith('-'));
        await uninstallCommand(flags, uninstallTarget || null);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.log(helpText());
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
