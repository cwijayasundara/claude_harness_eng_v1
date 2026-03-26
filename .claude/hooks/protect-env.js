#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
const filePath = input.tool_input && input.tool_input.file_path;

if (!filePath) {
  process.exit(0);
}

const filename = path.basename(filePath);

// Match .env, .env.local, .env.production, etc. but NOT .env.example
if (filename === '.env.example') {
  process.exit(0);
}

const envPattern = /^\.env(\..+)?$/;

if (envPattern.test(filename)) {
  process.stderr.write(
    `BLOCKED: Cannot modify ${filename} — environment files contain real secrets. Edit manually.\n`
  );
  process.exit(2);
}

process.exit(0);
