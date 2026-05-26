#!/usr/bin/env node

if (process.argv[1] === new URL(import.meta.url).pathname) {
  process.stdout.write(String(Date.now()) + '\n');
}
