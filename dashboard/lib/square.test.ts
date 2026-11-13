/**
 * lib/square.ts — cancelSquareSubscriptionIfActive tolerance matrix.
 *
 * The cancel is tolerant of a subscription that is already dead at Square,
 * and NOTHING else: a re-fetch that fails for any reason other than a
 * proven 404/not-found must rethrow, or deletion would proceed with
 * billing live. The Square client is mocked (no network); the errors
 * thrown here are shaped like the real SDK v44 SquareError
 * ({ statusCode, errors: [{ category, code }] }).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockCancel = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockGet = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>;

jest.mock('square', () => ({
  SquareClient: jest.fn().mockImplementation(() => ({
    subscriptions: {
      cancel: (...a: any[]) => (mockCancel as any)(...a),
      get: (...a: any[]) => (mockGet as any)(...a),
    },
    customers: {},
    cards: {},
    checkout: {},
    inventory: {},
  })),
  SquareEnvironment: { Production: 'production', Sandbox: 'sandbox' },
  WebhooksHelper: { verifySignature: jest.fn(async () => true) },
}));

import { cancelSquareSubscriptionIfActive, isSquareNotFound } from './square';

const CANCEL_ERR = new Error('cancel failed');

beforeEach(() => {
  mockCancel.mockReset();
  mockGet.mockReset();
  mockCancel.mockResolvedValue({ status: 'CANCELED' });
});

describe('isSquareNotFound', () => {
  it('true for HTTP 404', () => {
    expect(isSquareNotFound({ statusCode: 404 })).toBe(true);
  });

  it('true for a Square NOT_FOUND error body without a status code', () => {
    expect(isSquareNotFound({ errors: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND' }] })).toBe(true);
  });

  it('false for 500, 401, 429, plain errors, and non-objects', () => {
    expect(isSquareNotFound({ statusCode: 500 })).toBe(false);
    expect(isSquareNotFound({ statusCode: 401 })).toBe(false);
    expect(isSquareNotFound({ statusCode: 429 })).toBe(false);
    expect(isSquareNotFound({ errors: [{ code: 'INTERNAL_SERVER_ERROR' }] })).toBe(false);
    expect(isSquareNotFound(new Error('network down'))).toBe(false);
    expect(isSquareNotFound(null)).toBe(false);
    expect(isSquareNotFound(undefined)).toBe(false);
    expect(isSquareNotFound('404')).toBe(false);
  });
});

describe('cancelSquareSubscriptionIfActive', () => {
  it('cancel succeeds: resolves and never re-fetches', async () => {
    await cancelSquareSubscriptionIfActive('sq-1');
    expect(mockCancel).toHaveBeenCalledWith({ subscriptionId: 'sq-1' });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it.each(['CANCELED', 'DEACTIVATED', 'COMPLETED'])(
    'cancel throws + re-fetch shows %s: counts as done',
    async (status) => {
      mockCancel.mockRejectedValueOnce(CANCEL_ERR);
      mockGet.mockResolvedValueOnce({ subscription: { status } });
      await expect(cancelSquareSubscriptionIfActive('sq-1')).resolves.toBeUndefined();
      expect(mockGet).toHaveBeenCalledWith({ subscriptionId: 'sq-1' });
    },
  );

  it('cancel throws + re-fetch 404s: counts as done', async () => {
    mockCancel.mockRejectedValueOnce(CANCEL_ERR);
    mockGet.mockRejectedValueOnce({ statusCode: 404, errors: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND' }] });
    await expect(cancelSquareSubscriptionIfActive('sq-1')).resolves.toBeUndefined();
  });

  it('cancel throws + re-fetch 404s with a bare status code: counts as done', async () => {
    mockCancel.mockRejectedValueOnce(CANCEL_ERR);
    mockGet.mockRejectedValueOnce({ statusCode: 404 });
    await expect(cancelSquareSubscriptionIfActive('sq-1')).resolves.toBeUndefined();
  });

  it.each([500, 401, 429])(
    'cancel throws + re-fetch fails with HTTP %s: rethrows the original cancel error',
    async (statusCode) => {
      mockCancel.mockRejectedValueOnce(CANCEL_ERR);
      mockGet.mockRejectedValueOnce({ statusCode, errors: [{ code: 'INTERNAL_SERVER_ERROR' }] });
      await expect(cancelSquareSubscriptionIfActive('sq-1')).rejects.toBe(CANCEL_ERR);
    },
  );

  it('cancel throws + re-fetch fails with a network error: rethrows the original cancel error', async () => {
    mockCancel.mockRejectedValueOnce(CANCEL_ERR);
    mockGet.mockRejectedValueOnce(new Error('network down'));
    await expect(cancelSquareSubscriptionIfActive('sq-1')).rejects.toBe(CANCEL_ERR);
  });

  it.each(['ACTIVE', 'PAUSED', 'PENDING'])(
    'cancel throws + re-fetch shows %s: still live, rethrows',
    async (status) => {
      mockCancel.mockRejectedValueOnce(CANCEL_ERR);
      mockGet.mockResolvedValueOnce({ subscription: { status } });
      await expect(cancelSquareSubscriptionIfActive('sq-1')).rejects.toBe(CANCEL_ERR);
    },
  );

  it('cancel throws + re-fetch returns no subscription: rethrows (not a proven 404)', async () => {
    mockCancel.mockRejectedValueOnce(CANCEL_ERR);
    mockGet.mockResolvedValueOnce(undefined);
    await expect(cancelSquareSubscriptionIfActive('sq-1')).rejects.toBe(CANCEL_ERR);
  });
});
