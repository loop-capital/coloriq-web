/**
 * Phase 1 item 5 — photo→formula pairing at capture.
 *
 * Covers: pure pairing helpers, reference resolution, and the upload route
 * in both modes (presigned JSON + direct multipart) with R2 / Prisma /
 * auth mocked. No production or shared database is touched.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  isUuid,
  resolvePairingReferences,
  buildPhotoSidecar,
  photoSidecarKey,
  type PairingDb,
} from './photo-pairing';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const FORMULATION_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_UID = '1761690000000-abc1234';

const mockUploadToR2 = jest.fn(
  async (...args: any[]): Promise<string> => `https://r2.example.dev/${args[0]}`,
);
const mockGetPresignedUploadUrl = jest.fn(
  async (): Promise<string> => 'https://r2.example.dev/presigned',
);
const mockCreate = jest.fn(async (..._args: any[]): Promise<any> => ({ id: 'photo-1' }));
const mockSessionFind = jest.fn(async (..._args: any[]): Promise<any> => null);
const mockFormulationFind = jest.fn(async (..._args: any[]): Promise<any> => null);
const mockGetUser = jest.fn(async (..._args: any[]): Promise<any> => ({ userId: 'user-1' }));
const mockGetStylist = jest.fn(async (..._args: any[]): Promise<any> => ({ id: 'stylist-1' }));

jest.mock('@/lib/r2', () => ({
  uploadToR2: mockUploadToR2,
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  R2_PUBLIC_URL: 'https://r2.example.dev',
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    photo_analyses: { create: mockCreate },
    formulation_sessions: { findUnique: mockSessionFind },
    formulations: { findUnique: mockFormulationFind },
  },
}));
jest.mock('@/lib/auth', () => ({ getUserFromRequest: mockGetUser }));
jest.mock('@/lib/stylist', () => ({ getOrCreateStylistForUser: mockGetStylist }));

// Imported after the mocks above (jest hoists jest.mock calls).
import { POST } from '@/app/api/photos/upload/route';

function jsonRequest(body: Record<string, unknown>): any {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  };
}

function multipartRequest(entries: Record<string, string | File>): any {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v as any);
  return {
    headers: { get: () => 'multipart/form-data; boundary=---test' },
    formData: async () => fd,
  };
}

function sidecarJson(callIndex: number): any {
  const body = mockUploadToR2.mock.calls[callIndex][1] as Buffer;
  return JSON.parse(body.toString('utf8'));
}

describe('pairing helpers', () => {
  it('isUuid accepts UUIDs and rejects client uids', () => {
    expect(isUuid(SESSION_ID)).toBe(true);
    expect(isUuid(CLIENT_UID)).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('photoSidecarKey swaps the photo extension for .json', () => {
    expect(photoSidecarKey('photos/s/roots-123.jpg')).toBe('photos/s/roots-123.json');
    expect(photoSidecarKey('photos/s/ends-1.jpeg')).toBe('photos/s/ends-1.json');
  });

  it('buildPhotoSidecar carries session, formula, angle, timestamp', () => {
    const sidecar = buildPhotoSidecar({
      photoId: 'photo-1',
      sessionId: SESSION_ID,
      sessionReference: SESSION_ID,
      formulationId: FORMULATION_ID,
      angle: 'roots',
      photoKey: 'photos/s/roots-1.jpg',
      capturedAt: new Date('2026-10-28T21:00:00.000Z'),
    });
    expect(sidecar).toEqual({
      version: 1,
      photoId: 'photo-1',
      sessionId: SESSION_ID,
      sessionReference: SESSION_ID,
      formulationId: FORMULATION_ID,
      angle: 'roots',
      photoKey: 'photos/s/roots-1.jpg',
      capturedAt: '2026-10-28T21:00:00.000Z',
    });
  });
});

describe('resolvePairingReferences', () => {
  const fakeDb: PairingDb = {
    formulation_sessions: {
      findUnique: async ({ where }) =>
        where.id === SESSION_ID ? { id: SESSION_ID } : null,
    },
    formulations: {
      findUnique: async ({ where }) =>
        where.id === FORMULATION_ID ? { id: FORMULATION_ID } : null,
    },
  };

  it('resolves a real session id to the FK', async () => {
    const refs = await resolvePairingReferences(fakeDb, SESSION_ID, null);
    expect(refs).toEqual({ sessionReference: SESSION_ID, formulationId: null });
  });

  it('leaves the session FK null for client uids and unknown UUIDs', async () => {
    await expect(
      resolvePairingReferences(fakeDb, CLIENT_UID, null),
    ).resolves.toEqual({ sessionReference: null, formulationId: null });
    await expect(
      resolvePairingReferences(fakeDb, '33333333-3333-4333-8333-333333333333', null),
    ).resolves.toEqual({ sessionReference: null, formulationId: null });
  });

  it('resolves a supplied formulaId and rejects unknown ones', async () => {
    await expect(
      resolvePairingReferences(fakeDb, SESSION_ID, FORMULATION_ID),
    ).resolves.toEqual({ sessionReference: SESSION_ID, formulationId: FORMULATION_ID });
    await expect(
      resolvePairingReferences(fakeDb, SESSION_ID, '44444444-4444-4444-8444-444444444444'),
    ).rejects.toThrow(/Unknown formulaId/);
    await expect(
      resolvePairingReferences(fakeDb, SESSION_ID, 'not-a-uuid'),
    ).rejects.toThrow(/Unknown formulaId/);
  });

  it('leaves the formula FK null when no formulaId is supplied', async () => {
    await expect(resolvePairingReferences(fakeDb, SESSION_ID, null)).resolves.toEqual({
      sessionReference: SESSION_ID,
      formulationId: null,
    });
    await expect(
      resolvePairingReferences(fakeDb, SESSION_ID, undefined),
    ).resolves.toEqual({ sessionReference: SESSION_ID, formulationId: null });
  });
});

describe('POST /api/photos/upload pairing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ userId: 'user-1' });
    mockGetStylist.mockResolvedValue({ id: 'stylist-1' });
    mockSessionFind.mockResolvedValue(null);
    mockFormulationFind.mockResolvedValue(null);
  });

  it('presigned mode: real session + formulaId recorded in row and sidecar', async () => {
    mockSessionFind.mockResolvedValue({ id: SESSION_ID });
    mockFormulationFind.mockResolvedValue({ id: FORMULATION_ID });

    const res = await POST(
      jsonRequest({
        sessionId: SESSION_ID,
        angle: 'roots',
        contentType: 'image/jpeg',
        contentLength: 1234,
        formulaId: FORMULATION_ID,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.formulationId).toBe(FORMULATION_ID);
    expect(body.data.sidecarKey).toMatch(
      new RegExp(`^photos/${SESSION_ID}/roots-\\d+\\.json$`),
    );
    expect(body.data.key).toMatch(
      new RegExp(`^photos/${SESSION_ID}/roots-\\d+\\.jpeg$`),
    );
    // Same stem for photo key and sidecar key.
    expect(body.data.sidecarKey.replace(/\.json$/, '')).toBe(
      body.data.key.replace(/\.jpeg$/, ''),
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const row = mockCreate.mock.calls[0][0].data;
    expect(row.session_id).toBe(SESSION_ID);
    expect(row.formulation_id).toBe(FORMULATION_ID);
    expect(row.photo_label).toBe(SESSION_ID);

    // Presigned mode: only the sidecar goes through uploadToR2 (the photo
    // itself is PUT by the client to the presigned URL).
    expect(mockUploadToR2).toHaveBeenCalledTimes(1);
    expect(mockUploadToR2.mock.calls[0][0]).toBe(body.data.sidecarKey);
    const sidecar = sidecarJson(0);
    expect(sidecar.sessionId).toBe(SESSION_ID);
    expect(sidecar.sessionReference).toBe(SESSION_ID);
    expect(sidecar.formulationId).toBe(FORMULATION_ID);
    expect(sidecar.angle).toBe('roots');
    expect(sidecar.photoKey).toBe(body.data.key);
    expect(typeof sidecar.capturedAt).toBe('string');
  });

  it('presigned mode: client uid + no formulaId keeps working, FKs null, never invented', async () => {
    const res = await POST(
      jsonRequest({
        sessionId: CLIENT_UID,
        angle: 'mid',
        contentType: 'image/jpeg',
        contentLength: 999,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.formulationId).toBeNull();

    const row = mockCreate.mock.calls[0][0].data;
    expect(row.session_id).toBeNull();
    expect(row.formulation_id).toBeNull();
    expect(row.photo_label).toBe(CLIENT_UID);

    expect(mockSessionFind).not.toHaveBeenCalled();
    expect(mockFormulationFind).not.toHaveBeenCalled();
    const sidecar = sidecarJson(0);
    expect(sidecar.sessionId).toBe(CLIENT_UID);
    expect(sidecar.sessionReference).toBeNull();
    expect(sidecar.formulationId).toBeNull();
    expect(sidecar.angle).toBe('mid');
  });

  it('presigned mode: unknown formulaId is a 400 and creates no row', async () => {
    const res = await POST(
      jsonRequest({
        sessionId: SESSION_ID,
        angle: 'roots',
        contentType: 'image/jpeg',
        contentLength: 1234,
        formulaId: '44444444-4444-4444-8444-444444444444',
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Unknown formulaId/);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUploadToR2).not.toHaveBeenCalled();
  });

  it('direct mode: formulaId recorded in row and sidecar', async () => {
    mockSessionFind.mockResolvedValue({ id: SESSION_ID });
    mockFormulationFind.mockResolvedValue({ id: FORMULATION_ID });
    const file = new File([Buffer.from('fake-bytes')], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const res = await POST(
      multipartRequest({
        file,
        sessionId: SESSION_ID,
        angle: 'ends',
        formulaId: FORMULATION_ID,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.formulationId).toBe(FORMULATION_ID);

    const row = mockCreate.mock.calls[0][0].data;
    expect(row.session_id).toBe(SESSION_ID);
    expect(row.formulation_id).toBe(FORMULATION_ID);

    // Direct mode: photo bytes first, sidecar second.
    expect(mockUploadToR2).toHaveBeenCalledTimes(2);
    expect(mockUploadToR2.mock.calls[0][0]).toBe(body.data.key);
    expect(mockUploadToR2.mock.calls[1][0]).toBe(body.data.sidecarKey);
    const sidecar = sidecarJson(1);
    expect(sidecar.formulationId).toBe(FORMULATION_ID);
    expect(sidecar.angle).toBe('ends');
  });

  it('unchanged behavior: invalid angle and missing fields still 400', async () => {
    const badAngle = await POST(
      jsonRequest({ sessionId: SESSION_ID, angle: 'sideways' }),
    );
    expect(badAngle.status).toBe(400);
    const missing = await POST(jsonRequest({ angle: 'roots' }));
    expect(missing.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('unauthenticated requests still 401', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ sessionId: SESSION_ID, angle: 'roots' }),
    );
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
