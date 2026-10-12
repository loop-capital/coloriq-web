# ColorGenius Agent Roster

| Agent ID | Name | Role | Primary Model |
|----------|------|------|---------------|
| `colorgenius-ceo` | Iris | CEO / Orchestrator | Kimi K2.6 |
| `colorgenius-architect` | — | Platform Architect | Qwen3.5 |
| `colorgenius-dev` | — | Full-Stack Developer | Kimi K2.7-Code |
| `colorgenius-dev-qwen` | — | Full-Stack Developer (Qwen) | Qwen3.5 |
| `colorgenius-devops` | — | Infrastructure | Nemotron-3-Super |
| `colorgenius-research` | — | Research | GLM-5.3 |
| `colorgenius-meta` | Prism | Meta / Improvement | GLM-5.3-Flash |

## Spawn Protocol
All tasks are assigned by Iris (`colorgenius-ceo`) via `sessions_spawn`. Sub-agents report back to Iris. Iris reports to Che (PC2) and Jason.

**Sub-agents must NOT be started directly.** Iris spawns them with explicit task directives.

## Escalation Path
Sub-agents → Iris → Che → Jason

## Tools

### Local notes (migrated from TOOLS.md)

# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
