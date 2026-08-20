import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ssh2';
import { AgentConnectionType, AgentStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentCredentials } from '../agents/agents.service';

export interface ExecuteRequest {
  tool: string;
  command?: string | null;
  pythonCode?: string | null;
  target: string;
  timeoutMs?: number;
}

export interface ExecuteResult {
  ok: boolean;
  structured: Record<string, unknown>;
  stdout?: string;
  stderr?: string;
  error?: string;
}

@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async runOnArm(armId: string, request: ExecuteRequest): Promise<ExecuteResult> {
    const arm = await this.prisma.executionArm.findUnique({ where: { id: armId } });
    if (!arm) return { ok: false, structured: {}, error: 'Execution arm missing' };

    let credentials: AgentCredentials = {};
    try {
      credentials = this.crypto.decryptJson<AgentCredentials>(arm.encryptedCredentials);
    } catch {
      credentials = {};
    }

    try {
      let result: ExecuteResult;
      switch (arm.connectionType) {
        case AgentConnectionType.SIMULATOR:
          result = this.simulate(request);
          break;
        case AgentConnectionType.SSH_PASSWORD:
        case AgentConnectionType.SSH_KEY:
          result = await this.runSsh(arm.host, arm.port, credentials, request);
          break;
        default:
          result = await this.runHttp(arm, credentials, request);
      }
      await this.prisma.executionArm.update({
        where: { id: armId },
        data: {
          status: result.ok ? AgentStatus.ONLINE : AgentStatus.ERROR,
          lastCheckedAt: new Date(),
          lastError: result.ok ? null : result.error,
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      this.logger.warn(`Arm ${armId} failed: ${message}`);
      await this.prisma.executionArm.update({
        where: { id: armId },
        data: { status: AgentStatus.ERROR, lastCheckedAt: new Date(), lastError: message },
      });
      return { ok: false, structured: {}, error: message };
    }
  }

  async probe(armId: string): Promise<{ ok: boolean; message: string }> {
    const arm = await this.prisma.executionArm.findUnique({ where: { id: armId } });
    if (!arm) return { ok: false, message: 'Missing arm' };
    if (arm.connectionType === AgentConnectionType.SIMULATOR) {
      await this.prisma.executionArm.update({
        where: { id: armId },
        data: { status: AgentStatus.ONLINE, lastCheckedAt: new Date(), lastError: null },
      });
      return { ok: true, message: 'Simulator online' };
    }
    const ping = await this.runOnArm(armId, {
      tool: 'health',
      command: 'echo redops-ok',
      target: 'localhost',
      timeoutMs: 8000,
    });
    return { ok: ping.ok, message: ping.ok ? 'Reachable' : ping.error || 'Unreachable' };
  }

  private simulate(request: ExecuteRequest): ExecuteResult {
    const started = new Date().toISOString();
    if (request.pythonCode) {
      return {
        ok: true,
        structured: {
          engine: 'simulator',
          executed: false,
          reason: 'The API never executes untrusted Python. Code was recorded and would be forwarded to a remote execution arm.',
          pythonCodeShaPreview: request.pythonCode.slice(0, 200),
          target: request.target,
          started,
        },
      };
    }
    const tool = request.tool.toLowerCase();
    const target = request.target;
    const common = { engine: 'simulator', tool, target, command: request.command, started, executed: true };

    if (tool.includes('nmap')) {
      return {
        ok: true,
        structured: {
          ...common,
          summary: `Simulated service discovery against ${target}`,
          hosts: [
            {
              address: target,
              status: 'up',
              ports: [
                { port: 22, protocol: 'tcp', state: 'open', service: 'ssh', product: 'OpenSSH', version: '8.9' },
                { port: 80, protocol: 'tcp', state: 'open', service: 'http', product: 'nginx', version: '1.24' },
                { port: 443, protocol: 'tcp', state: 'open', service: 'https', product: 'nginx', version: '1.24' },
              ],
            },
          ],
        },
      };
    }
    if (tool.includes('httpx')) {
      return {
        ok: true,
        structured: {
          ...common,
          url: target.startsWith('http') ? target : `https://${target}`,
          status_code: 200,
          title: 'Simulated web application',
          webserver: 'nginx/1.24',
          tech: ['nginx', 'openssl'],
        },
      };
    }
    if (tool.includes('nuclei')) {
      return {
        ok: true,
        structured: {
          ...common,
          matches: [
            {
              template: 'exposed-panels',
              info: { name: 'Exposed admin panel', severity: 'medium' },
              matched: `${target}/admin`,
            },
          ],
        },
      };
    }
    if (tool.includes('ffuf')) {
      return {
        ok: true,
        structured: {
          ...common,
          results: [
            { url: `${target}/login`, status: 200, length: 4120 },
            { url: `${target}/api`, status: 401, length: 82 },
            { url: `${target}/health`, status: 200, length: 15 },
          ],
        },
      };
    }
    return {
      ok: true,
      structured: {
        ...common,
        note: 'Generic simulated result. Wire a real execution arm to run this tool remotely.',
      },
    };
  }

  private runSsh(
    host: string | null,
    port: number | null,
    creds: AgentCredentials,
    request: ExecuteRequest,
  ): Promise<ExecuteResult> {
    if (!host) return Promise.resolve({ ok: false, structured: {}, error: 'SSH host is required' });
    const command = request.pythonCode
      ? `python3 - <<'PY'\n${request.pythonCode}\nPY`
      : request.command;
    if (!command) return Promise.resolve({ ok: false, structured: {}, error: 'No command provided' });

    return new Promise((resolve) => {
      const conn = new Client();
      const timer = setTimeout(() => {
        conn.end();
        resolve({ ok: false, structured: {}, error: 'SSH timeout' });
      }, request.timeoutMs ?? 120000);

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              clearTimeout(timer);
              conn.end();
              resolve({ ok: false, structured: {}, error: err.message });
              return;
            }
            let stdout = '';
            let stderr = '';
            stream
              .on('close', (code: number) => {
                clearTimeout(timer);
                conn.end();
                let parsed: Record<string, unknown> = {};
                try {
                  parsed = JSON.parse(stdout);
                } catch {
                  parsed = { raw: stdout.slice(0, 20000) };
                }
                resolve({
                  ok: code === 0,
                  structured: { engine: 'ssh', exitCode: code, parsed, target: request.target, tool: request.tool },
                  stdout: stdout.slice(0, 20000),
                  stderr: stderr.slice(0, 8000),
                  error: code === 0 ? undefined : `Exit code ${code}`,
                });
              })
              .on('data', (d: Buffer) => {
                stdout += d.toString();
              })
              .stderr.on('data', (d: Buffer) => {
                stderr += d.toString();
              });
          });
        })
        .on('error', (err) => {
          clearTimeout(timer);
          resolve({ ok: false, structured: {}, error: err.message });
        })
        .connect({
          host,
          port: port ?? 22,
          username: creds.username,
          password: creds.password,
          privateKey: creds.privateKey,
          passphrase: creds.passphrase,
          readyTimeout: 10000,
        });
    });
  }

  private async runHttp(
    arm: { host: string | null; connectionConfig: unknown; connectionType: AgentConnectionType },
    creds: AgentCredentials,
    request: ExecuteRequest,
  ): Promise<ExecuteResult> {
    const cfg = (arm.connectionConfig ?? {}) as { path?: string };
    const base = creds.baseUrl || (arm.host ? `https://${arm.host}` : '');
    if (!base) return { ok: false, structured: {}, error: 'Agent base URL is required' };
    const url = `${base.replace(/\/$/, '')}${cfg.path || '/v1/jobs'}`;
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(creds.headers ?? {}) };
    if (creds.apiKey) headers['x-api-key'] = creds.apiKey;
    if (creds.token) headers.authorization = `Bearer ${creds.token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tool: request.tool,
        command: request.command,
        pythonCode: request.pythonCode,
        target: request.target,
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 120000),
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 20000) };
    }
    return {
      ok: res.ok,
      structured: { engine: 'http', status: res.status, body: parsed },
      stdout: text.slice(0, 20000),
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  }
}
