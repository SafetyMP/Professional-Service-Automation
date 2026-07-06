#!/usr/bin/env python3
"""subagentStop: fleet thin-handoff observability — parent must re-verify."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import allow, log_event, read_input, read_repo_profile  # noqa: E402


def main() -> int:
    payload = read_input()
    prof = read_repo_profile() or {}
    profile_name = prof.get("profile", "")
    log_event(
        "subagent_stop",
        {
            "profile": profile_name,
            "subagent": payload.get("subagent") or payload.get("agent_name"),
            "handoff_reminder": profile_name == "fleet",
        },
    )
    allow()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
