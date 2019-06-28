from . import cli
from .params import db_options
from meltano.core.db import project_engine


@cli.command(hidden=True)
def repl():
    # dynamic includes
    import IPython
    from traitlets.config import Config

    # First create a config object from the traitlets library
    c = Config()

    c.InteractiveShellApp.extensions = ["autoreload"]
    c.InteractiveShellApp.exec_lines = [
        'print("\\nBooting import Meltano REPL\\n")',
        "from meltano.core.project import Project",
        "from meltano.core.plugin import PluginRef, PluginInstall, Plugin",
        "from meltano.core.plugin.setting import PluginSetting",
        "from meltano.core.plugin.settings_service import PluginSettingsService",
        "from meltano.core.config_service import ConfigService",
        "from meltano.core.db import project_engine",
        "%autoreload 2",
    ]
    # c.InteractiveShell.colors = 'LightBG'
    c.InteractiveShell.confirm_exit = False
    c.TerminalIPythonApp.display_banner = True

    # Now we start ipython with our configuration
    IPython.start_ipython(argv=[], config=c)