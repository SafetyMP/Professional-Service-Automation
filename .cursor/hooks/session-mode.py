#!/usr/bin/env python3
"""beforeSubmitPrompt: persist HALTED / NEGOTIATE_ONLY / CLEAR from user instructions."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import (  # noqa: E402
    detect_instruction_mode,
    emit,
    mandate_status,
    read_input,
    repo_root,
    save_mode,
)


def main() -> int:
    payload = read_input()
    prompt = payload.get("prompt") or ""
    root = repo_root(payload)

    detected = detect_instruction_mode(prompt)
    if detected:
        save_mode(root, detected, "user instruction")
    elif mandate_status(root) == "HALTED":
        save_mode(root, "HALTED", "mandate file")

    emit({"continue": True})
    return 0


if __name__ == "__main__":
    sys.exit(main())
