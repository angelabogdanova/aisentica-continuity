begin;

alter table public.domain_bindings
  drop constraint if exists domain_bindings_verification_status_check;
update public.domain_bindings set verification_status = 'FAILED'
where verification_status not in ('PENDING', 'VERIFIED', 'FAILED');
alter table public.domain_bindings
  add constraint domain_bindings_verification_status_check
  check (verification_status in ('PENDING', 'VERIFIED', 'FAILED'));

create unique index if not exists domain_bindings_one_verified_per_agent
  on public.domain_bindings (agent_id) where verification_status = 'VERIFIED';
create unique index if not exists domain_bindings_one_verified_domain
  on public.domain_bindings (lower(domain)) where verification_status = 'VERIFIED';
create index if not exists domain_bindings_pending_lookup
  on public.domain_bindings (agent_id, domain) where verification_status = 'PENDING';

create or replace function public.create_pending_domain_binding(
  p_agent_id text, p_owner_id text, p_domain text, p_verification_token text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_agent public.agents%rowtype; v_binding public.domain_bindings%rowtype;
begin
  select * into v_agent from public.agents where id = p_agent_id for update;
  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> p_owner_id then raise exception 'Agent ownership mismatch.' using errcode = '42501'; end if;
  if v_agent.canonical_domain is not null then raise exception 'Agent already has a verified domain.' using errcode = 'P0001'; end if;
  delete from public.domain_bindings where agent_id = p_agent_id and verification_status in ('PENDING', 'FAILED');
  insert into public.domain_bindings (id, agent_id, domain, verification_token, verification_status)
  values (gen_random_uuid(), p_agent_id, lower(p_domain), p_verification_token, 'PENDING') returning * into v_binding;
  return to_jsonb(v_binding);
end;
$$;

create or replace function public.fail_domain_binding(
  p_agent_id text, p_owner_id text, p_binding_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.agents where id = p_agent_id and owner_id = p_owner_id) then
    raise exception 'Agent ownership mismatch.' using errcode = '42501';
  end if;
  update public.domain_bindings set verification_status = 'FAILED'
  where id = p_binding_id and agent_id = p_agent_id and verification_status = 'PENDING';
end;
$$;

create or replace function public.complete_domain_binding(
  p_agent_id text, p_owner_id text, p_binding_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_agent public.agents%rowtype; v_owner public.demo_owners%rowtype;
  v_binding public.domain_bindings%rowtype; v_initial public.agent_versions%rowtype;
  v_version public.agent_versions%rowtype; v_event public.agent_events%rowtype; v_now timestamptz := now();
begin
  select * into v_agent from public.agents where id = p_agent_id for update;
  if not found then raise exception 'Agent not found.' using errcode = 'P0001'; end if;
  if v_agent.owner_id <> p_owner_id then raise exception 'Agent ownership mismatch.' using errcode = '42501'; end if;
  if v_agent.current_version <> 1 or v_agent.canonical_domain is not null then raise exception 'Agent cannot enter Domain Binding.' using errcode = 'P0001'; end if;
  select * into v_binding from public.domain_bindings where id = p_binding_id and agent_id = p_agent_id for update;
  if not found or v_binding.verification_status <> 'PENDING' then raise exception 'Pending domain binding not found.' using errcode = 'P0001'; end if;
  select * into v_initial from public.agent_versions where agent_id = p_agent_id and version_number = 1;
  if not found then raise exception 'Initial Agent Version not found.' using errcode = 'P0001'; end if;
  select * into v_owner from public.demo_owners where id = p_owner_id;

  update public.domain_bindings set verification_status = 'VERIFIED', verified_at = v_now where id = p_binding_id returning * into v_binding;
  update public.agents set canonical_domain = v_binding.domain, current_version = 2, updated_at = v_now where id = p_agent_id returning * into v_agent;
  insert into public.agent_versions (id, agent_id, version_number, version_type, state_json, change_summary, created_by_owner_id, created_at)
  values (gen_random_uuid(), p_agent_id, 2, 'DOMAIN_BINDING', v_initial.state_json || jsonb_build_object('canonicalDomain', v_binding.domain, 'domainVerificationStatus', 'VERIFIED', 'domainVerifiedAt', v_now), 'Verified canonical domain ' || v_binding.domain || '.', p_owner_id, v_now)
  returning * into v_version;
  insert into public.agent_events (id, agent_id, event_type, actor_owner_id, metadata_json, created_at)
  values (gen_random_uuid(), p_agent_id, 'BIND_DOMAIN', p_owner_id, jsonb_build_object('domain', v_binding.domain, 'version', '2'), v_now)
  returning * into v_event;
  return jsonb_build_object('agent', to_jsonb(v_agent), 'owner', to_jsonb(v_owner), 'version', to_jsonb(v_version), 'event', to_jsonb(v_event));
end;
$$;

revoke execute on function public.create_pending_domain_binding(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.fail_domain_binding(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.complete_domain_binding(text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_pending_domain_binding(text, text, text, text) to service_role;
grant execute on function public.fail_domain_binding(text, text, uuid) to service_role;
grant execute on function public.complete_domain_binding(text, text, uuid) to service_role;

alter table public.domain_bindings enable row level security;
revoke all privileges on table public.domain_bindings from anon, authenticated;
grant select, insert, update, delete on table public.domain_bindings to service_role;

commit;
