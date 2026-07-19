begin;

create or replace function public.park_agent(
  p_agent_id text,
  p_owner_id text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents%rowtype;
  v_owner public.demo_owners%rowtype;
  v_current public.agent_versions%rowtype;
  v_version public.agent_versions%rowtype;
  v_event public.agent_events%rowtype;
  v_next_version integer;
  v_park_record jsonb;
  v_next_state jsonb;
  v_now timestamptz := now();
begin
  if char_length(trim(coalesce(p_reason, ''))) < 10
     or char_length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Parking reason must be between 10 and 500 characters.' using errcode = '22023';
  end if;

  select * into v_agent
  from public.agents
  where id = p_agent_id
  for update;

  if not found then
    raise exception 'Agent not found.' using errcode = 'P0001';
  end if;

  if v_agent.owner_id <> p_owner_id then
    raise exception 'Agent ownership mismatch.' using errcode = '42501';
  end if;

  if v_agent.status <> 'ACTIVE' then
    raise exception 'Only ACTIVE agents can be parked.' using errcode = 'P0001';
  end if;

  if v_agent.canonical_domain is null or v_agent.current_version < 3 then
    raise exception 'The agent must have a verified domain and developed state before Park.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.agent_events
    where agent_id = p_agent_id and event_type = 'DEVELOP'
  ) then
    raise exception 'At least one DEVELOP event is required before Park.' using errcode = 'P0001';
  end if;

  select * into v_current
  from public.agent_versions
  where agent_id = p_agent_id
    and version_number = v_agent.current_version;

  if not found then
    raise exception 'Current Agent Version not found.' using errcode = 'P0001';
  end if;

  select * into v_owner
  from public.demo_owners
  where id = p_owner_id;

  v_next_version := v_agent.current_version + 1;
  v_park_record := jsonb_build_object(
    'reason', trim(p_reason),
    'parkedAt', v_now
  );
  v_next_state := v_current.state_json || jsonb_build_object(
    'parkHistory', coalesce(v_current.state_json->'parkHistory', '[]'::jsonb) || jsonb_build_array(v_park_record),
    'latestPark', v_park_record
  );

  insert into public.agent_versions (
    id,
    agent_id,
    version_number,
    version_type,
    state_json,
    change_summary,
    created_by_owner_id,
    created_at
  ) values (
    gen_random_uuid(),
    p_agent_id,
    v_next_version,
    'PARKED',
    v_next_state,
    'Agent parked: ' || trim(p_reason),
    p_owner_id,
    v_now
  ) returning * into v_version;

  insert into public.agent_events (
    id,
    agent_id,
    event_type,
    actor_owner_id,
    metadata_json,
    created_at
  ) values (
    gen_random_uuid(),
    p_agent_id,
    'PARK',
    p_owner_id,
    jsonb_build_object('version', v_next_version::text),
    v_now
  ) returning * into v_event;

  update public.agents
  set status = 'PARKED',
      current_version = v_next_version,
      updated_at = v_now
  where id = p_agent_id
  returning * into v_agent;

  return jsonb_build_object(
    'agent', to_jsonb(v_agent),
    'owner', to_jsonb(v_owner),
    'version', to_jsonb(v_version),
    'event', to_jsonb(v_event)
  );
end;
$$;

revoke execute on function public.park_agent(text, text, text)
  from public, anon, authenticated;

grant execute on function public.park_agent(text, text, text)
  to service_role;

commit;
