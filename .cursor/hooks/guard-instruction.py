#!/usr/bin/env python3
"""preToolUse: block mutating tools when session is HALTED or NEGOTIATE_ONLY."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import (  # noqa: E402
    MUTATING_TOOLS,
    effective_mode,
    emit,
    is_specs_write,
    read_input,
    repo_root,
    tool_path,
)


def main() -> int:
    payload = read_input()
    root = repo_root(payload)
    mode, reason = effective_mode(root)
    tool_name = payload.get("tool_name") or ""
    tool_input = payload.get("tool_input") or {}

    if mode == "CLEAR" or tool_name not in MUTATING_TOOLS:
        emit({"permission": "allow"})
        return 0

    if mode == "NEGOTIATE_ONLY":
        path = tool_path(tool_name, tool_input)
        if tool_name in {"Write", "StrReplace", "Delete", "ApplyPatch"} and is_specs_write(path):
            emit({"permission": "allow"})
            return 0
        emit({
            "permission": "deny",
            "user_message": "Negotiate-only mode: edits limited to specs/ until user says proceed.",
            "agent_message": (
                f"Blocked {tool_name}: NEGOTIATE_ONLY ({reason}). "
                "Write only under specs/, or ask user to proceed."
            ),
        })
        return 0

    emit({
        "permission": "deny",
        "user_message": "Work is halted. No mutating tools until user says proceed with scope.",
        "agent_message": (
            f"Blocked {tool_name}: HALTED ({reason}). "
            "Debrief or blocker brief only; no implementation."
        ),
    })
    return 0


if __name__ == "__main__":
    sys.exit(main())
