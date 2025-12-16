import crypto from 'crypto';
import fs from 'fs';

/**
 * Gera hash SHA-256 de um arquivo
 * Requisito do Decreto 10.278/2020 para garantia de integridade
 */
export function generateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Gera hash SHA-256 de um buffer
 */
export function generateBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Verifica integridade do arquivo comparando hashes
 */
export async function verifyFileIntegrity(
  filePath: string,
  expectedHash: string
): Promise<boolean> {
  const currentHash = await generateFileHash(filePath);
  return currentHash === expectedHash;
}
