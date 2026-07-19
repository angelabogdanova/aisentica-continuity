import { NextResponse } from 'next/server';
import { domainProofForHost } from '@/lib/domain-proof';
import { repository } from '@/lib/repository';

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId } = await context.params;
    const proof = await domainProofForHost(repository, agentId, request.headers.get('host'));
    return proof ? NextResponse.json(proof, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Domain proof not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Domain proof not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
}
