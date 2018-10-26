from meltano.core.db import DB, SystemModel


class Runner:
    def before_run(self, *args, **kwargs):
        SystemModel.metadata.create_all(DB.default.engine)

    def run(self, *args, **kwargs):
        pass

    def perform(self, *args, **kwargs):
        self.before_run(*args, **kwargs)
        self.run(*args, **kwargs)