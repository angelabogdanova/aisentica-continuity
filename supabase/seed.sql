insert into demo_owners(id,display_name,slug) values ('owner-a','Owner A','owner-a'),('owner-b','Owner B','owner-b') on conflict (id) do nothing;
