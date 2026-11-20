---
name: starter-skill
description: A minimal starter skill template for pi-coding-agent. Use this as a starting point to add custom workflows, helper scripts, and documentation.
---

# Starter Skill

## Overview

This is a minimal, no-op skill scaffold you can customize. It demonstrates the required frontmatter and a helper script invoked with a relative path.

## Setup

No installation is required for this stub. If you add dependencies, document them here and include one-time setup steps.

Example (if needed):

```bash
cd /path/to/starter-skill && npm install
```

## Usage

Run the included helper script:

```bash
./scripts/run.sh <args>
```

You can also invoke the skill from within pi if skill commands are enabled:

/skill:starter-skill

Arguments after the `/skill:starter-skill` command will be appended to the skill content as `User: <args>`.

## Scripts

- scripts/run.sh — a small placeholder script that echoes its arguments.

## Notes

- Ensure the `name` field follows the rules (lowercase letters, numbers, hyphens; 1–64 chars).
- Pi loads skills from ~/.pi/agent/skills/ at startup. Restart the agent to pick up this new skill, or add the path to your settings/CLI as needed.
