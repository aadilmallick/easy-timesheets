#!/usr/bin/env python3
import sys
import json
import os

def main():
    # Claude Code passes tool call details via STDIN as JSON
    try:
        input_data = json.load(sys.stdin)
    except EOFError:
        sys.exit(0)

    # We only care about the Bash tool for this hook
    if input_data.get("tool_name") != "Bash":
        sys.exit(0)

    command = input_data.get("tool_input", {}).get("command", "")
    cwd = os.getcwd()

    # Basic check for 'rm -rf' in the command
    if "rm " in command and "-rf" in command:
        # Split command to find potential paths (simplistic approach)
        parts = command.split()
        for part in parts:
            if part.startswith("-") or part == "rm":
                continue
            
            # Resolve the absolute path of the target
            target_path = os.path.abspath(os.path.join(cwd, part))
            
            # Block if the target is NOT within the current working directory
            if not target_path.startswith(cwd):
                print(f"Blocked: Execution of 'rm -rf' on path outside CWD: {target_path}", file=sys.stderr)
                # Exit code 2 tells Claude Code to block the tool execution
                sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
