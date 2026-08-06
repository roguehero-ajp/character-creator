import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'codex', 'manifest.json');
const errors = [];
const globalIds = new Set();

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
  const entriesById = new Map();
  const categoryIds = new Set((payload.categories || []).map((category) => category.id));
  const allowedTypes = new Set(collection.entryTypes || []);
  const fallbackType = allowedTypes.size === 1 ? Array.from(allowedTypes)[0] : null;

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
    entriesById.set(entry.id, entry);

    if (!entry.title || typeof entry.title !== 'string') {
      errors.push(`${label}: missing title.`);
    }
    if (entry.gameSystem !== gameSystem.id || entry.edition !== edition.id) {
      errors.push(`${label}: gameSystem or edition is incorrect.`);
    }

    const entryType = entry.entryType || fallbackType;
    if (!entryType || !allowedTypes.has(entryType)) {
      errors.push(`${label}: unsupported entryType ${entryType || '(missing)'}.`);
    }

    if (!categoryIds.has(entry.category)) {
      errors.push(`${label}: unknown category ${entry.category}.`);
    }

    const globalId = `${gameSystem.id}:${edition.id}:${entryType}:${entry.id}`;
    if (globalIds.has(globalId)) {
      errors.push(`${label}: duplicate global id ${globalId}.`);
    }
    globalIds.add(globalId);

    if (entryType === 'equipment' || entryType === 'ancestry') {
      if (!entry.description || typeof entry.description !== 'string') {
        errors.push(`${label}: ${entryType} entry is missing a description.`);
      }
      if (!Array.isArray(entry.facts)) {
        errors.push(`${label}: ${entryType} facts must be an array.`);
      } else {
        entry.facts.forEach((fact, factIndex) => {
          if (!fact?.label || !fact?.value) {
            errors.push(`${label}: fact ${factIndex + 1} needs label and value.`);
          }
        });
      }
      if (entryType === 'ancestry') {
        if (!entry.sourceSection || typeof entry.sourceSection !== 'string') {
          errors.push(`${label}: ancestry entry is missing sourceSection.`);
        }
        if (!Array.isArray(entry.traits)) {
          errors.push(`${label}: ancestry traits must be an array.`);
        } else {
          entry.traits.forEach((trait, traitIndex) => {
            if (!trait?.name || !trait?.description) {
              errors.push(`${label}: trait ${traitIndex + 1} needs name and description.`);
            }
          });
        }
      }
      if (entry.sourceDocument !== edition.source) {
        errors.push(`${label}: sourceDocument must be ${edition.source}.`);
      }
      if (entry.license !== 'CC BY 4.0') {
        errors.push(`${label}: ${entryType} entry must declare CC BY 4.0.`);
      }
    }
  });

  payload.entries.forEach((entry) => {
    (entry.related || []).forEach((relatedId) => {
      if (!ids.has(relatedId)) {
        errors.push(`${collection.url}: ${entry.id} links to missing related entry ${relatedId}.`);
      }
    });

    if (entry.parentId && !ids.has(entry.parentId)) {
      errors.push(`${collection.url}: ${entry.id} links to missing parent entry ${entry.parentId}.`);
    }

    (entry.childIds || []).forEach((childId) => {
      if (!ids.has(childId)) {
        errors.push(`${collection.url}: ${entry.id} links to missing child entry ${childId}.`);
        return;
      }

      const child = entriesById.get(childId);
      if (child?.parentId !== entry.id) {
        errors.push(`${collection.url}: ${childId} does not point back to parent ${entry.id}.`);
      }
    });

    if (entry.parentId && ids.has(entry.parentId)) {
      const parent = entriesById.get(entry.parentId);
      if (!Array.isArray(parent?.childIds) || !parent.childIds.includes(entry.id)) {
        errors.push(`${collection.url}: parent ${entry.parentId} does not list child ${entry.id}.`);
      }
    }
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
          } else {
            const allowedTypes = new Set(collection.entryTypes || []);

            payload.entries
              .filter((entry) => entry?.edition === edition.id && allowedTypes.has(entry.type))
              .forEach((entry, index) => {
                if (!entry.id || !entry.name) {
                  errors.push(`${collection.url}: legacy entry ${index + 1} is missing an id or name.`);
                  return;
                }

                const globalId = `${gameSystem.id}:${edition.id}:${entry.type}:${entry.id}`;
                if (globalIds.has(globalId)) {
                  errors.push(`${collection.url}: duplicate global id ${globalId}.`);
                }
                globalIds.add(globalId);
              });
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
  console.log(`Codex validation passed (${globalIds.size.toLocaleString('en-CA')} versioned entries checked).`);
}
