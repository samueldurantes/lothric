import * as yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const openApiJsonPath = join(__dirname, '../docs/openapi.json');
const openApiYamlPath = join(__dirname, '../docs/openapi.yaml');

try {
  const jsonContent = readFileSync(openApiJsonPath, 'utf8');
  const jsonData = JSON.parse(jsonContent);

  const yamlContent = yaml.dump(jsonData, {
    indent: 2,
    lineWidth: -1,
  });

  writeFileSync(openApiYamlPath, yamlContent, 'utf8');
  console.log('File openapi.yaml created successfully!');
} catch (error) {
  console.error('Error converting file:', error);
  process.exit(1);
}
