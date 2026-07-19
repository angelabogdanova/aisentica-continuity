import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireOwner, assertAgentOwner } from '@/lib/auth';
import { normalizeRequestHost } from '@/lib/domain-verification';
import { AgentDetailView } from '@/components/agent-detail';

export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const owner = await requireOwner();
  const { agentId } = await params;
  try {
    const detail = await assertAgentOwner(agentId, owner.id);
    const currentDomain = detail.agent.canonicalDomain ? undefined : normalizeRequestHost((await headers()).get('host'));
    return <AgentDetailView detail={detail} privateView currentDomain={currentDomain}/>;
  } catch { notFound(); }
}
