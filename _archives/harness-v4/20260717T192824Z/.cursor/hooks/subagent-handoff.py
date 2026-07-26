#!/usr/bin/env python3
"""subagentStop: fleet thin-handoff observability — parent must re-verify."""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import allow, log_event, read_input, read_repo_profile, resolve_workspace_root  # noqa: E402


def _visual_ui_meta(root: Path) -> bool:
    return (root / "specs/ui-manifest.yaml").is_file() or (root / "docs/ui-action-items.md").is_file()


def main() -> int:
    payload = read_input()
    prof = read_repo_profile() or {}
    profile_name = prof.get("profile", "")
    root = Path(resolve_workspace_root(payload))
    visual_reminder = profile_name == "portfolio-ops" and _visual_ui_meta(root)
    log_event(
        "subagent_stop",
        {
            "profile": profile_name,
            "subagent": payload.get("subagent") or payload.get("agent_name"),
            "handoff_reminder": profile_name in {"fleet", "portfolio-ops"},
            "visual_handoff_reminder": visual_reminder,
        },
    )
    allow()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
