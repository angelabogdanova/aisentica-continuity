begin;

-- Align the repository RPC contract with the verified production function.
drop function if exists public.create_agent_with_initial_state(text, text, jsonb);

create function public.create_agent_with_initial_state(
  p_agent_id text,
  p_owner_id text,
  p_manifest jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents%rowtype;
  v_owner public.demo_owners%rowtype;
  v_version public.agent_versions%rowtype;
  v_event public.agent_events%rowtype;
begin
  select *
  into v_owner
  from public.demo_owners
  where id = p_owner_id;

  if not found then
    raise exception 'Owner not found.' using errcode = 'P0001';
  end if;

  insert into public.agents (
    id,
    canonical_name,
    role,
    purpose,
    field,
    owner_id,
    status,
    current_version
  ) values (
    p_agent_id,
    p_manifest->>'canonicalName',
    p_manifest->>'role',
    p_manifest->>'purpose',
    p_manifest->>'field',
    p_owner_id,
    'ACTIVE',
    1
  ) returning * into v_agent;

  insert into public.agent_versions (
    id,
    agent_id,
    version_number,
    version_type,
    state_json,
    change_summary,
    created_by_owner_id
  ) values (
    gen_random_uuid(),
    p_agent_id,
    1,
    'INITIAL_MANIFEST',
    p_manifest,
    'Initial Agent Manifest created.',
    p_owner_id
  ) returning * into v_version;

  insert into public.agent_events (
    id,
    agent_id,
    event_type,
    actor_owner_id,
    metadata_json
  ) values (
    gen_random_uuid(),
    p_agent_id,
    'CREATE',
    p_owner_id,
    jsonb_build_object('version', '1')
  ) returning * into v_event;

  return jsonb_build_object(
    'agent', to_jsonb(v_agent),
    'owner', to_jsonb(v_owner),
    'version', to_jsonb(v_version),
    'event', to_jsonb(v_event)
  );
end;
$$;

alter table public.demo_owners enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.agent_events enable row level security;
alter table public.domain_bindings enable row level security;
alter table public.transfer_tokens enable row level security;

revoke all privileges on table public.demo_owners from anon, authenticated;
revoke all privileges on table public.agents from anon, authenticated;
revoke all privileges on table public.agent_versions from anon, authenticated;
revoke all privileges on table public.agent_events from anon, authenticated;
revoke all privileges on table public.domain_bindings from anon, authenticated;
revoke all privileges on table public.transfer_tokens from anon, authenticated;

grant select, insert, update, delete on table public.demo_owners to service_role;
grant select, insert, update, delete on table public.agents to service_role;
grant select, insert, update, delete on table public.agent_versions to service_role;
grant select, insert, update, delete on table public.agent_events to service_role;
grant select, insert, update, delete on table public.domain_bindings to service_role;
grant select, insert, update, delete on table public.transfer_tokens to service_role;

revoke execute on function public.create_agent_with_initial_state(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_agent_with_initial_state(text, text, jsonb)
  to service_role;

insert into public.demo_owners (id, display_name, slug)
values
  ('owner-a', 'Owner A', 'owner-a'),
  ('owner-b', 'Owner B', 'owner-b')
on conflict (id) do update
set
  display_name = excluded.display_name,
  slug = excluded.slug;

commit;
