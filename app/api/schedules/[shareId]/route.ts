import { handleApi } from '@/lib/publish/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ shareId: string }> };
export async function GET(request: Request, context: Context) {
  return handleApi(request, (await context.params).shareId);
}
export async function PUT(request: Request, context: Context) {
  return handleApi(request, (await context.params).shareId);
}
export async function DELETE(request: Request, context: Context) {
  return handleApi(request, (await context.params).shareId);
}
