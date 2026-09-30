import { execFile } from 'node:child_process';
import { open, mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CERTIFICATE = path.join(ROOT, 'tools', 'weekly-ppt', 'delivery-certificate.pem');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, '_build', 'weekly-ppt', 'encrypted');

function cli(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!['--input', '--certificate', '--output-dir'].includes(key) || !args[index + 1]) {
      throw new Error('Uso: node scripts/encrypt-weekly-ppt.mjs --input <borrador.pptx> [--certificate <cert.pem>] [--output-dir <directorio>]');
    }
    options[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = args[index + 1];
  }
  if (!options.input) throw new Error('Falta --input');
  return options;
}

export async function encryptWeeklyPpt(options) {
  const input = path.resolve(options.input);
  const certificate = path.resolve(options.certificate ?? DEFAULT_CERTIFICATE);
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR);
  if (path.extname(input).toLowerCase() !== '.pptx') throw new Error('Solo se cifra un borrador .pptx');
  const inputStat = await stat(input);
  if (!inputStat.isFile() || inputStat.size < 1000) throw new Error('El borrador PPTX está vacío o incompleto');
  const handle = await open(input, 'r');
  try {
    const signature = Buffer.alloc(4);
    await handle.read(signature, 0, 4, 0);
    if (!signature.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) throw new Error('El borrador no tiene la cabecera ZIP de un PPTX');
  } finally {
    await handle.close();
  }
  await run('openssl', ['x509', '-in', certificate, '-noout', '-checkend', '0']);
  await mkdir(outputDir, { recursive: true });
  const output = path.join(outputDir, `${path.basename(input)}.cms`);
  try {
    await run('openssl', ['cms', '-encrypt', '-binary', '-aes256', '-in', input,
      '-out', output, '-outform', 'DER', '-recip', certificate]);
    const outputStat = await stat(output);
    if (!outputStat.isFile() || outputStat.size < 100) throw new Error('OpenSSL no produjo un archivo CMS válido');
  } catch (error) {
    await unlink(output).catch(() => {});
    throw error;
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  encryptWeeklyPpt(cli(process.argv.slice(2)))
    .then((output) => console.log(output))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
