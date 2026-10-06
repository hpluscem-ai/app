import { AuthApiError, getApiUrl, request as requestJson, type SessionOptions } from './authApi';

export type MileageApplication = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  decidedAt: string | null;
  mileageAmount: number | null;
  finalAmount: number | null;
  rejectionReason: string | null;
};
export type MileagePhotoMode = 'single' | 'separate';
export type MileageDetail = MileageApplication & {
  photoMode: MileagePhotoMode;
  submissionVersion: string;
  photos: { receipt: string | null; meter: string | null };
};
export type MileageFilter = {
  period: 'oneMonth' | 'threeMonths' | 'custom';
  sort: 'latest' | 'oldest';
  startDate: string;
  endDate: string;
};
export type MileageQuery = {
  createdFrom?: string;
  createdBefore?: string;
  order?: 'asc' | 'desc';
  cursor?: string;
};
export type MileageUpload = { uri: string; name: string; type: string; file?: Blob };
export type MileageSubmission = { key: string; photoMode: MileagePhotoMode; receipt: MileageUpload; meter?: MileageUpload };
export type MileageResubmission = { key: string; photoMode: MileagePhotoMode; submissionVersion: string; receipt?: MileageUpload; meter?: MileageUpload };

export function formatMileageDate(date: Date): string {
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;
}

export function mileageQuery(filter: MileageFilter, now = new Date()): MileageQuery {
  const invalidDate = () => new AuthApiError('조회 기간을 올바른 날짜로 입력해주세요.', 'INVALID_DATE_RANGE');
  const parse = (value: string) => {
    const match = /^(\d{4})\. (\d{2})\. (\d{2})$/.exec(value);
    if (!match) throw invalidDate();
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw invalidDate();
    return date;
  };
  let start: Date;
  const end = filter.period === 'custom' ? parse(filter.endDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter.period === 'custom') start = parse(filter.startDate);
  else {
    start = new Date(end.getFullYear(), end.getMonth() - (filter.period === 'oneMonth' ? 1 : 3), 1);
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(end.getDate(), last));
  }
  if (start > end) throw invalidDate();
  // Calendar arithmetic keeps the entire last local day, including DST transitions.
  end.setDate(end.getDate() + 1);
  return { createdFrom: start.toISOString(), createdBefore: end.toISOString(), order: filter.sort === 'latest' ? 'desc' : 'asc' };
}

function invalidResponse(): never {
  throw new AuthApiError('서버 응답을 확인하지 못했습니다. 다시 시도해주세요.', 'INVALID_RESPONSE');
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidResponse();
  return value as Record<string, unknown>;
}
function applicationId(id: string): string {
  if (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id)) {
    throw new AuthApiError('신청 정보를 확인할 수 없습니다.', 'INVALID_APPLICATION_ID');
  }
  return id;
}
function application(value: unknown): MileageApplication {
  const data = record(value);
  const date = (value: unknown) => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  const amount = (value: unknown) => value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
  if (typeof data.id !== 'string' || !['pending', 'approved', 'rejected'].includes(String(data.status)) ||
    !date(data.submittedAt) || (data.decidedAt !== null && !date(data.decidedAt)) ||
    !amount(data.mileageAmount) || !amount(data.finalAmount) ||
    (data.rejectionReason !== null && typeof data.rejectionReason !== 'string')) return invalidResponse();
  try { applicationId(data.id); } catch { return invalidResponse(); }
  return data as MileageApplication;
}
function detail(value: unknown, id?: string): MileageDetail {
  const data = application(value);
  if (id && data.id !== id) return invalidResponse();
  const version = record(value).submissionVersion;
  if (typeof version !== 'string' || !/^[0-9a-f]{64}$/.test(version)) return invalidResponse();
  const photoMode = record(value).photoMode ?? 'separate';
  if (photoMode !== 'single' && photoMode !== 'separate') return invalidResponse();
  const photos = record(record(value).photos);
  for (const kind of ['receipt', 'meter'] as const) {
    if (photos[kind] !== null && photos[kind] !== `/api/v1/mileage/applications/${data.id}/photos/${kind}`) return invalidResponse();
  }
  return { ...data, photoMode, submissionVersion: version, photos: photos as MileageDetail['photos'] };
}

// Multipart and protected image bodies need a different transport from the JSON-only auth API.
async function mileageRequest(path: string, session: SessionOptions, options: {
  body?: FormData; signal?: AbortSignal; photo?: boolean; expectedStatus?: 200 | 201;
} = {}): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, options.body ? 60_000 : 15_000);
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/mileage/applications${path}`, {
      method: options.body ? 'POST' : 'GET', body: options.body,
      headers: { Accept: options.photo ? 'image/jpeg' : 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
      credentials: session.credentials ?? 'omit', signal: controller.signal, redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const error = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      throw new AuthApiError(typeof error.message === 'string' ? error.message : '서버 요청에 실패했습니다. 다시 시도해주세요.', typeof error.code === 'string' ? error.code : '', response.status);
    }
    if (response.status !== (options.expectedStatus ?? (options.body ? 201 : 200))) return invalidResponse();
    if (!options.photo) return await response.json().catch(invalidResponse);
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/jpeg') return invalidResponse();
    const blob = await response.blob();
    if (!blob.size) return invalidResponse();
    return blob;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError(options.body
      ? '서버 요청 결과를 확인하지 못했습니다. 같은 사진으로 다시 시도해주세요.'
      : '서버 요청 결과를 확인하지 못했습니다. 다시 시도해주세요.', 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function getMileageSummary(session: SessionOptions): Promise<{ accumulatedMileage: number }> {
  const data = record(await requestJson('/mileage/summary', { ...session, expectedStatus: 200 }));
  const value = data.accumulatedMileage;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalidResponse();
  return { accumulatedMileage: value };
}

export async function getMileageApplications(query: MileageQuery, session: SessionOptions, signal?: AbortSignal) {
  const params = new URLSearchParams({ ...query, limit: '20' });
  const data = record(await mileageRequest(`?${params}`, session, { signal }));
  if (!Array.isArray(data.items) || (data.nextCursor !== null && (typeof data.nextCursor !== 'string' || !data.nextCursor))) return invalidResponse();
  const items = data.items.map(application);
  if (new Set(items.map(item => item.id)).size !== items.length) return invalidResponse();
  return { items, nextCursor: data.nextCursor as string | null };
}

export async function getMileageApplication(id: string, session: SessionOptions, signal?: AbortSignal): Promise<MileageDetail> {
  return detail(await mileageRequest(`/${applicationId(id)}`, session, { signal }), id);
}

function submissionBody(input: { key: string; photoMode?: MileagePhotoMode; receipt?: MileageUpload; meter?: MileageUpload }): FormData {
  const body = new FormData();
  body.append('idempotencyKey', applicationId(input.key));
  if (input.photoMode) body.append('photoMode', input.photoMode);
  for (const kind of ['receipt', 'meter'] as const) {
    const photo = input[kind];
    if (!photo) continue;
    if (photo.file) body.append(kind, photo.file, photo.name);
    // React Native FormData accepts a local URI descriptor instead of a web Blob.
    else body.append(kind, { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  }
  return body;
}

export async function createMileageApplication(input: MileageSubmission, session: SessionOptions, signal?: AbortSignal): Promise<MileageDetail> {
  return detail(await mileageRequest('', session, { body: submissionBody(input), signal }));
}

export async function resubmitMileageApplication(id: string, input: MileageResubmission, session: SessionOptions, signal?: AbortSignal): Promise<MileageDetail> {
  applicationId(id);
  if (!input.receipt && !input.meter) throw new AuthApiError('교체할 사진을 한 장 이상 선택해주세요.', 'PHOTO_REQUIRED');
  if (!/^[0-9a-f]{64}$/.test(input.submissionVersion)) throw new AuthApiError('신청 내역을 다시 조회해주세요.', 'INVALID_SUBMISSION_VERSION');
  const body = submissionBody(input);
  body.append('submissionVersion', input.submissionVersion);
  return detail(await mileageRequest(`/${id}/resubmit`, session, { body, signal, expectedStatus: 200 }), id);
}

export async function getMileagePhoto(id: string, kind: 'receipt' | 'meter', session: SessionOptions, signal?: AbortSignal): Promise<Blob> {
  if (kind !== 'receipt' && kind !== 'meter') return invalidResponse();
  return await mileageRequest(`/${applicationId(id)}/photos/${kind}`, session, { signal, photo: true }) as Blob;
}
