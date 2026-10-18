import { handleApi } from '@/lib/publish/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return handleApi(request);
}
