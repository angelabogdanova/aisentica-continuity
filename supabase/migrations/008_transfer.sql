begin;

alter table public.transfer_tokens
  add column if not exists from_version integer,
  add column if not exists handoff_summary text;

update public.transfer_tokens t
set from_version = a.current_version
from public.agents a
where t.agent_id = a.id and t.from_version is null;

update public.transfer_tokens
set handoff_summary = 'Legacy transfer offer retained during schema alignment.'
where handoff_summary is null;

alter table public.transfer_tokens
  alter column from_version set not null,
  alter column handoff_summary set not null;

alter table public.transfer_tokens
  drop constraint if exists transfer_tokens_from_version_check,
  add constraint transfer_tokens_from_version_check check (from_version > 0),
  drop constraint if exists transfer_tokens_handoff_summary_check,
  add constraint transfer_tokens_handoff_summary_check check (char_length(handoff_summary) between 20 and 1000);

create unique index if not exists transfer_tokens_hash_uidx
  on public.transfer_tokens(token_hash);

alter table public.agents drop constraint if exists agents_status_check;
alter table public.agents
  add constraint agents_status_check check (status in ('ACTIVE', 'PARKED', 'TRANSFERRED'));

create or replace function public.create_transfer_offer(
  p_agent_id text,
  p_from_owner_id text,
  p_intended_owner_id text,
  p_token_hash text,
  p_handoff_summary text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents%rowtype;
  v_offer public.transfer_tokens%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid transfer token hash.' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_handoff_summary, ''))) < 20
     or char_length(trim(coalesce(p_handoff_summary, ''))) > 1000 then
    raise exception 'Handoff summary must be between 20 and 1000 characters.' using errcode = '22023';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'Transfer expiry must be within the next 30 minutes.' using errcode = '22023';
  end if;

  select * into v_agent
  from public.agents
  where id = p_agent_id
  for update;

  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> p_from_owner_id then raise exception 'Agent ownership mismatch.' using errcode = '42501'; end if;
  if v_agent.status <> 'ACTIVE' then raise exception 'Only ACTIVE agents can be transferred.' using errcode = 'P0001'; end if;
  if v_agent.canonical_domain is null or v_agent.current_version < 5 then
    raise exception 'Reactivate must be completed before Transfer.' using errcode = 'P0001';
  end if;
  if p_from_owner_id = p_intended_owner_id then raise exception 'Intended owner must be different.' using errcode = '22023'; end if;
  if not exists (select 1 from public.demo_owners where id = p_intended_owner_id) then
    raise exception 'Intended owner not found.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.agent_events where agent_id = p_agent_id and event_type = 'REACTIVATE') then
    raise exception 'A REACTIVATE event is required before Transfer.' using errcode = 'P0001';
  end if;

  delete from public.transfer_tokens
  where agent_id = p_agent_id and accepted_at is null;

  insert into public.transfer_tokens (
    id, agent_id, from_owner_id, intended_owner_id, token_hash,
    from_version, handoff_summary, expires_at, accepted_at, created_at
  ) values (
    gen_random_uuid(), p_agent_id, p_from_owner_id, p_intended_owner_id, p_token_hash,
    v_agent.current_version, trim(p_handoff_summary), p_expires_at, null, now()
  ) returning * into v_offer;

  return jsonb_build_object(
    'id', v_offer.id,
    'agent_id', v_offer.agent_id,
    'from_owner_id', v_offer.from_owner_id,
    'intended_owner_id', v_offer.intended_owner_id,
    'from_version', v_offer.from_version,
    'handoff_summary', v_offer.handoff_summary,
    'expires_at', v_offer.expires_at,
    'accepted_at', v_offer.accepted_at,
    'created_at', v_offer.created_at
  );
end;
$$;

create or replace function public.accept_agent_transfer(
  p_token_hash text,
  p_intended_owner_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.transfer_tokens%rowtype;
  v_agent public.agents%rowtype;
  v_owner public.demo_owners%rowtype;
  v_current public.agent_versions%rowtype;
  v_version public.agent_versions%rowtype;
  v_event public.agent_events%rowtype;
  v_next_version integer;
  v_transfer_record jsonb;
  v_next_state jsonb;
  v_now timestamptz := now();
begin
  select * into v_offer
  from public.transfer_tokens
  where token_hash = p_token_hash
  for update;

  if not found then raise exception 'Transfer offer not found.' using errcode = 'P0001'; end if;
  if v_offer.intended_owner_id <> p_intended_owner_id then raise exception 'Transfer owner mismatch.' using errcode = '42501'; end if;
  if v_offer.accepted_at is not null then raise exception 'Transfer offer already accepted.' using errcode = 'P0001'; end if;
  if v_offer.expires_at <= v_now then raise exception 'Transfer offer expired.' using errcode = 'P0001'; end if;

  select * into v_agent
  from public.agents
  where id = v_offer.agent_id
  for update;

  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> v_offer.from_owner_id then raise exception 'Transfer offer is stale.' using errcode = 'P0001'; end if;
  if v_agent.status <> 'ACTIVE' then raise exception 'Transfer offer is not applicable to current status.' using errcode = 'P0001'; end if;
  if v_agent.current_version <> v_offer.from_version then raise exception 'Transfer offer is stale after a state change.' using errcode = 'P0001'; end if;

  select * into v_current
  from public.agent_versions
  where agent_id = v_agent.id and version_number = v_agent.current_version;
  if not found then raise exception 'Current Agent Version not found.' using errcode = 'P0001'; end if;

  select * into v_owner from public.demo_owners where id = p_intended_owner_id;
  if not found then raise exception 'Intended owner not found.' using errcode = 'P0001'; end if;

  v_next_version := v_agent.current_version + 1;
  v_transfer_record := jsonb_build_object(
    'fromOwnerId', v_offer.from_owner_id,
    'toOwnerId', p_intended_owner_id,
    'handoffSummary', v_offer.handoff_summary,
    'transferredAt', v_now
  );
  v_next_state := v_current.state_json || jsonb_build_object(
    'transferHistory', coalesce(v_current.state_json->'transferHistory', '[]'::jsonb) || jsonb_build_array(v_transfer_record),
    'latestTransfer', v_transfer_record
  );

  insert into public.agent_versions (
    id, agent_id, version_number, version_type, state_json,
    change_summary, created_by_owner_id, created_at
  ) values (
    gen_random_uuid(), v_agent.id, v_next_version, 'TRANSFERRED', v_next_state,
    'Agent ownership transferred through an accepted single-use offer.', p_intended_owner_id, v_now
  ) returning * into v_version;

  insert into public.agent_events (
    id, agent_id, event_type, actor_owner_id, metadata_json, created_at
  ) values (
    gen_random_uuid(), v_agent.id, 'TRANSFER', p_intended_owner_id,
    jsonb_build_object('version', v_next_version::text), v_now
  ) returning * into v_event;

  update public.agents
  set owner_id = p_intended_owner_id,
      status = 'TRANSFERRED',
      current_version = v_next_version,
      updated_at = v_now
  where id = v_agent.id
  returning * into v_agent;

  update public.transfer_tokens set accepted_at = v_now where id = v_offer.id;

  return jsonb_build_object(
    'agent', to_jsonb(v_agent),
    'owner', to_jsonb(v_owner),
    'version', to_jsonb(v_version),
    'event', to_jsonb(v_event)
  );
end;
$$;

revoke execute on function public.create_transfer_offer(text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.accept_agent_transfer(text, text)
  from public, anon, authenticated;

grant execute on function public.create_transfer_offer(text, text, text, text, text, timestamptz)
  to service_role;
grant execute on function public.accept_agent_transfer(text, text)
  to service_role;

commit;
