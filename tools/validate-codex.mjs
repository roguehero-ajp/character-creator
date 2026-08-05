import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'codex', 'manifest.json');
const errors = [];

async function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const text = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(text);
}

function validateV2(payload, collection, gameSystem, edition) {
  if (payload.schemaVersion !== 2) {
    errors.push(`${collection.url}: schemaVersion must be 2.`);
  }
  if (payload.gameSystem !== gameSystem.id) {
    errors.push(`${collection.url}: gameSystem does not match the manifest.`);
  }
  if (payload.edition !== edition.id) {
    errors.push(`${collection.url}: edition does not match the manifest.`);
  }
  if (!Array.isArray(payload.entries)) {
    errors.push(`${collection.url}: entries must be an array.`);
    return;
  }

  const ids = new Set();
  const categoryIds = new Set((payload.categories || []).map((category) => category.id));

  payload.entries.forEach((entry, index) => {
    const label = `${collection.url} entry ${index + 1}`;

    if (!entry?.id || typeof entry.id !== 'string') {
      errors.push(`${label}: missing string id.`);
      return;
    }
    if (ids.has(entry.id)) {
      errors.push(`${collection.url}: duplicate id ${entry.id}.`);
    }
    ids.add(entry.id);

    if (!entry.title || typeof entry.title !== 'string') {
      errors.push(`${label}: missing title.`);
    }
    if (entry.gameSystem !== gameSystem.id || entry.edition !== edition.id) {
      errors.push(`${label}: gameSystem or edition is incorrect.`);
    }
    if (!categoryIds.has(entry.category)) {
      errors.push(`${label}: unknown category ${entry.category}.`);
    }
  });

  payload.entries.forEach((entry) => {
    (entry.related || []).forEach((relatedId) => {
      if (!ids.has(relatedId)) {
        errors.push(`${collection.url}: ${entry.id} links to missing related entry ${relatedId}.`);
      }
    });
  });
}

const manifest = await readJson(path.relative(root, manifestPath));

if (manifest.schemaVersion !== 2 || !Array.isArray(manifest.gameSystems)) {
  errors.push('data/codex/manifest.json is not a valid schema version 2 manifest.');
} else {
  for (const gameSystem of manifest.gameSystems) {
    for (const edition of gameSystem.editions || []) {
      for (const collection of edition.collections || []) {
        const payload = await readJson(collection.url);

        if (collection.adapter === 'codex-v2') {
          validateV2(payload, collection, gameSystem, edition);
        } else if (collection.adapter === 'legacy-srd') {
          if (!Array.isArray(payload.entries)) {
            errors.push(`${collection.url}: legacy SRD file has no entries array.`);
          }
        } else {
          errors.push(`${collection.id}: unsupported adapter ${collection.adapter}.`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`Codex validation failed with ${errors.length} problem(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Codex validation passed.');
}
