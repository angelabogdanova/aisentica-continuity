begin;

create or replace function public.continue_agent(
  p_agent_id text,
  p_owner_id text,
  p_objective text
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
  v_continuation_record jsonb;
  v_next_state jsonb;
  v_now timestamptz := now();
begin
  if char_length(trim(coalesce(p_objective, ''))) < 20
     or char_length(trim(coalesce(p_objective, ''))) > 1000 then
    raise exception 'Continuation objective must be between 20 and 1000 characters.' using errcode = '22023';
  end if;

  select * into v_agent
  from public.agents
  where id = p_agent_id
  for update;

  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> p_owner_id then raise exception 'Agent ownership mismatch.' using errcode = '42501'; end if;
  if v_agent.status <> 'TRANSFERRED' then raise exception 'Only a transferred agent can enter Continue.' using errcode = 'P0001'; end if;

  select * into v_current
  from public.agent_versions
  where agent_id = p_agent_id and version_number = v_agent.current_version;

  if not found then raise exception 'Current Agent Version not found.' using errcode = 'P0001'; end if;
  if v_current.version_type <> 'TRANSFERRED' then raise exception 'The current state must be the transferred checkpoint.' using errcode = 'P0001'; end if;
  if not exists (
    select 1 from public.agent_events
    where agent_id = p_agent_id
      and event_type = 'TRANSFER'
      and metadata_json->>'version' = v_agent.current_version::text
  ) then
    raise exception 'A matching TRANSFER event is required before Continue.' using errcode = 'P0001';
  end if;

  select * into v_owner from public.demo_owners where id = p_owner_id;
  if not found then raise exception 'Owner not found.' using errcode = 'P0001'; end if;

  v_next_version := v_agent.current_version + 1;
  v_continuation_record := jsonb_build_object(
    'objective', trim(p_objective),
    'inheritedFromVersion', v_agent.current_version,
    'continuitySummary', 'The same Agent continued under successor ownership with identity, verified domain, and complete prior state preserved.',
    'continuedAt', v_now
  );
  v_next_state := v_current.state_json || jsonb_build_object(
    'continuationHistory', coalesce(v_current.state_json->'continuationHistory', '[]'::jsonb) || jsonb_build_array(v_continuation_record),
    'latestContinuation', v_continuation_record
  );

  insert into public.agent_versions (
    id, agent_id, version_number, version_type, state_json,
    change_summary, created_by_owner_id, created_at
  ) values (
    gen_random_uuid(), p_agent_id, v_next_version, 'CONTINUED', v_next_state,
    'Agent continued under successor ownership.', p_owner_id, v_now
  ) returning * into v_version;

  insert into public.agent_events (
    id, agent_id, event_type, actor_owner_id, metadata_json, created_at
  ) values (
    gen_random_uuid(), p_agent_id, 'CONTINUE', p_owner_id,
    jsonb_build_object('version', v_next_version::text), v_now
  ) returning * into v_event;

  update public.agents
  set status = 'ACTIVE',
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

revoke execute on function public.continue_agent(text, text, text)
  from public, anon, authenticated;
grant execute on function public.continue_agent(text, text, text)
  to service_role;

commit;
