create or replace function create_agent_with_initial_state(
  p_agent_id text,
  p_owner_id text,
  p_manifest jsonb
) returns table (agent jsonb, owner jsonb, version jsonb, event jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_agent agents%rowtype;
  v_owner demo_owners%rowtype;
  v_version agent_versions%rowtype;
  v_event agent_events%rowtype;
begin
  select * into v_owner from demo_owners where id = p_owner_id;
  if not found then raise exception 'Owner not found.' using errcode = 'P0001'; end if;

  insert into agents (id, canonical_name, role, purpose, field, owner_id, status, current_version)
  values (p_agent_id, p_manifest->>'canonicalName', p_manifest->>'role', p_manifest->>'purpose', p_manifest->>'field', p_owner_id, 'ACTIVE', 1)
  returning * into v_agent;

  insert into agent_versions (id, agent_id, version_number, version_type, state_json, change_summary, created_by_owner_id)
  values (gen_random_uuid(), p_agent_id, 1, 'INITIAL_MANIFEST', p_manifest, 'Initial Agent Manifest created.', p_owner_id)
  returning * into v_version;

  insert into agent_events (id, agent_id, event_type, actor_owner_id, metadata_json)
  values (gen_random_uuid(), p_agent_id, 'CREATE', p_owner_id, jsonb_build_object('version', '1'))
  returning * into v_event;

  return query select to_jsonb(v_agent), to_jsonb(v_owner), to_jsonb(v_version), to_jsonb(v_event);
end;
$$;
