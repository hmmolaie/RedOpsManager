import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('ENCRYPTION_KEY') ?? '';
    if (!raw || raw.length < 32) {
      throw new InternalServerErrorException('ENCRYPTION_KEY must be at least 32 characters');
    }
    this.key = raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }

  decryptJson<T>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  randomToken(bytes = 48): string {
    return randomBytes(bytes).toString('hex');
  }

  sha256(content: Buffer | string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
