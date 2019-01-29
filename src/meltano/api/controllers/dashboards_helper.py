import os
import json
import time
from os.path import join
from pathlib import Path
from meltano.core.utils import slugify


class DashboardsHelper:
    def __init__(self):
        self.meltano_model_path = join(os.getcwd(), "model")
        self.dashboard_version = "0.1.0"

    def get_dashboards(self):
        contents = []
        dashboard_files = list(Path(self.meltano_model_path).glob("*.dashboard.m5o"))
        for dashboard in dashboard_files:
            file_name = dashboard.parts[-1]
            file = Path(self.meltano_model_path).joinpath(file_name)
            with file.open() as f:
                contents.append(json.load(f))
        return contents

    def get_dashboard(self, dashboard_id):
        dashboards = self.get_dashboards()
        target_dashboard = [
            dashboard for dashboard in dashboards if dashboard["id"] == dashboard_id
        ]
        return target_dashboard[0]

    def save_dashboard(self, data):
        data["version"] = self.dashboard_version
        data["created_at"] = time.time()
        data["slug"] = slugify(data["name"])
        data["report_ids"] = []
        file_name = data["slug"] + ".dashboard.m5o"
        file_path = Path(self.meltano_model_path).joinpath(file_name)
        with open(file_path, "w") as f:
            json.dump(data, f)
        return data