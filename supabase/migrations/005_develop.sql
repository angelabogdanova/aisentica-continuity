begin;

create or replace function public.develop_agent(
  p_agent_id text,
  p_owner_id text,
  p_development jsonb
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
  v_next_state jsonb;
  v_now timestamptz := now();
begin
  select * into v_agent from public.agents where id = p_agent_id for update;
  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> p_owner_id then raise exception 'Agent ownership mismatch.' using errcode = '42501'; end if;
  if v_agent.status <> 'ACTIVE' then raise exception 'Only ACTIVE agents can Develop.' using errcode = 'P0001'; end if;
  if v_agent.canonical_domain is null or v_agent.current_version < 2 then raise exception 'Verified canonical domain required.' using errcode = 'P0001'; end if;

  select * into v_current from public.agent_versions
  where agent_id = p_agent_id and version_number = v_agent.current_version;
  if not found then raise exception 'Current Agent Version not found.' using errcode = 'P0001'; end if;
  select * into v_owner from public.demo_owners where id = p_owner_id;

  v_next_version := v_agent.current_version + 1;
  v_next_state := v_current.state_json || jsonb_build_object(
    'developmentHistory', coalesce(v_current.state_json->'developmentHistory', '[]'::jsonb) || jsonb_build_array(p_development),
    'latestDevelopment', p_development
  );

  insert into public.agent_versions (id, agent_id, version_number, version_type, state_json, change_summary, created_by_owner_id, created_at)
  values (gen_random_uuid(), p_agent_id, v_next_version, 'DEVELOPMENT', v_next_state, p_development->>'taskSummary', p_owner_id, v_now)
  returning * into v_version;

  insert into public.agent_events (id, agent_id, event_type, actor_owner_id, metadata_json, created_at)
  values (gen_random_uuid(), p_agent_id, 'DEVELOP', p_owner_id, jsonb_build_object('version', v_next_version::text), v_now)
  returning * into v_event;

  update public.agents set current_version = v_next_version, updated_at = v_now
  where id = p_agent_id returning * into v_agent;

  return jsonb_build_object('agent', to_jsonb(v_agent), 'owner', to_jsonb(v_owner), 'version', to_jsonb(v_version), 'event', to_jsonb(v_event));
end;
$$;

revoke execute on function public.develop_agent(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.develop_agent(text, text, jsonb) to service_role;

commit;
