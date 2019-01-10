{
  sql_table_name = gitlab.region
  name = region
  dimensions {
    id {
      primary_key = true
      hidden = true
      type = string
      sql = "{{table}}.id"
    }

    name {
      label = Name
      description = Carbon region long name
      type = string
      sql = "{{table}}.dnoregion"
    }

    short_name {
      label = Short Name
      description = Carbon region short name
      type = string
      sql = "{{table}}.shortname"
    }
  }
  measures {
    count {
      label = Count
      description = Runner Count
      type = count
      sql = "{{table}}.id"
    }
  }
}