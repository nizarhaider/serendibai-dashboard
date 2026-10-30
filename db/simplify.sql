do $$
begin
  if to_regclass('public.portal_quotas') is not null then
    lock table portal_quotas in access exclusive mode;
    if exists(select 1 from portal_quotas where tokens<>1000000 or minutes<>1000 or calls<>500 or label<>'Workspace limits') then
      raise exception 'Customized quotas exist; preserve them before removing this table';
    end if;
    drop table portal_quotas;
  end if;
end $$;
