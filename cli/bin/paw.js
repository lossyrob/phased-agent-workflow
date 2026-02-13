#!/usr/bin/env node

import { installCommand } from '../lib/commands/install.js';
import { listCommand } from '../lib/commands/list.js';
import { uninstallCommand } from '../lib/commands/uninstall.js';
import { upgradeCommand } from '../lib/commands/upgrade.js';
import { VERSION } from '../lib/version.js';

const HELP = `
paw - Phased Agent Workflow CLI

Usage: paw <command> [options]

Commands:
  install <target>   Install PAW agents and skills
  upgrade            Check for updates and upgrade
  list               Show installed version and components
  uninstall          Remove PAW agents and skills

Options:
  --help, -h         Show this help message
  --version, -v      Show version number
  --force, -f        Skip confirmation prompts

Examples:
  paw install copilot    Install to GitHub Copilot CLI
  paw install claude     Install to Claude Code CLI
  paw list               Show installation status
  paw upgrade            Upgrade to latest version
  paw uninstall          Remove all PAW files
`;

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }
  
  const command = args[0];
  const flags = {
    force: args.includes('--force') || args.includes('-f'),
  };
  
  try {
    switch (command) {
      case 'install': {
        const target = args[1];
        if (!target) {
          console.error('Error: install requires a target (e.g., "copilot")');
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
      case 'uninstall':
        await uninstallCommand(flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
