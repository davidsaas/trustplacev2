-- Create safety metrics table
create table if not exists safety_metrics (
    id uuid default uuid_generate_v4() primary key,
    district text not null,
    night_safety float not null,
    vehicle_safety float not null,
    child_safety float not null,
    transit_safety float not null,
    women_safety float not null,
    last_updated timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now()
);

-- Create index for faster lookups by district
create index if not exists idx_safety_metrics_district on safety_metrics(district);

-- Create RLS policies
alter table safety_metrics enable row level security;

create policy "Allow public read access"
on safety_metrics for select
to public
using (true);

-- Function to get safety metrics for a district
create or replace function get_district_safety_metrics(district_name text)
returns json
language sql
security definer
as $$
    select json_build_object(
        'district', district,
        'metrics', json_build_object(
            'night_safety', night_safety,
            'vehicle_safety', vehicle_safety,
            'child_safety', child_safety,
            'transit_safety', transit_safety,
            'women_safety', women_safety
        ),
        'last_updated', last_updated
    )
    from safety_metrics
    where district = district_name
    order by last_updated desc
    limit 1;
$$; 