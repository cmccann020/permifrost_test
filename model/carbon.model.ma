{
  version = 1
  name = carbon
  # Postgres DB
  connection = runners_db
  label = carbon intensity
  explores {
    region {
      label = Region
      from = region
      description = Region Carbon Intensity Data

      joins {
        entry {
            label = Entry
            fields = [entry.from, entry.to]
            sql_on = "{{ region.id }} = {{ entry.region_id }}"
            relationship = one_to_one
        }
      }
    }
  }
}