import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ValidateSignature } from './validate-signature.guard.js';

const SECRET = 'test-secret';
const BODY = Buffer.from('{"eventId":"evt-1"}');

const contextWith = (headers: Record<string, string>, rawBody?: Buffer) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers, rawBody }) }),
  }) as ExecutionContext;

describe('ValidateSignature', () => {
  const guard = new ValidateSignature({ getOrThrow: () => SECRET } as never);
  const sign = (body: Buffer) =>
    createHmac('sha256', SECRET).update(body).digest('hex');

  it('accepts a valid signature, with or without the sha256= prefix', () => {
    const signature = sign(BODY);

    expect(
      guard.canActivate(contextWith({ 'x-webhook-signature': signature }, BODY)),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextWith({ 'x-webhook-signature': `sha256=${signature}` }, BODY),
      ),
    ).toBe(true);
  });

  it('rejects a signature computed over a different body', () => {
    const signature = sign(Buffer.from('tampered'));

    expect(() =>
      guard.canActivate(contextWith({ 'x-webhook-signature': signature }, BODY)),
    ).toThrow(UnauthorizedException);
  });

  it('rejects malformed or missing signatures', () => {
    expect(() =>
      guard.canActivate(contextWith({ 'x-webhook-signature': 'zz' }, BODY)),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith({}, BODY))).toThrow(
      UnauthorizedException,
    );
  });
});
