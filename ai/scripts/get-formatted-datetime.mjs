#!/usr/bin/env node

export function getFormattedDateTime(timestamp = Date.now()) {
  const dateTime = new Date(timestamp)
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(2, 14);
  return `${dateTime.substring(0, 6)}_${dateTime.slice(6)}`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(getFormattedDateTime());
}
