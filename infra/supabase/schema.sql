-- Example schema
create table energy_data (
  id uuid primary key default gen_random_uuid(),
  region text,
  consumption float,
  timestamp timestamptz default now()
);
