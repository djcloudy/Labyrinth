import { SnippetLanguage } from '@/lib/types';

export interface DocTemplate {
  id: string;
  label: string;
  description: string;
  title: string;
  content: string;
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'runbook',
    label: 'Runbook',
    description: 'Operational procedure for a service',
    title: 'Runbook: <service>',
    content: `# Runbook: <service>

## Summary
Brief description of what this service does and why it matters.

## Owners
- Primary:
- Backup:

## Health checks
- URL / command:
- Expected response:

## Common alerts
| Alert | Likely cause | First action |
|-------|--------------|--------------|
|       |              |              |

## Restart / recovery
\`\`\`bash
# Steps to safely restart
\`\`\`

## Escalation
When to page someone and who.

## Related
- Docs:
- Dashboards:
`,
  },
  {
    id: 'install',
    label: 'Installation Notes',
    description: 'How a piece of software was installed',
    title: 'Install: <software>',
    content: `# Install: <software>

## Host
- Machine:
- OS / version:
- Date:

## Prerequisites
- [ ]

## Steps
1.

## Configuration
Paths, env vars, ports.

## Verification
How you confirmed it works.

## Gotchas
Anything that bit you.
`,
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    description: 'Symptom → cause → fix',
    title: 'Troubleshooting: <symptom>',
    content: `# Troubleshooting: <symptom>

## Symptom
What you observed.

## Environment
Where it happened.

## Investigation
- Log:
- Command:
- Result:

## Root cause
The actual reason.

## Fix
\`\`\`bash
# Commands that resolved it
\`\`\`

## Prevention
How to avoid this next time.
`,
  },
  {
    id: 'architecture',
    label: 'Architecture Notes',
    description: 'System diagram + decisions',
    title: 'Architecture: <system>',
    content: `# Architecture: <system>

## Overview
One-paragraph summary.

## Components
| Component | Role | Tech |
|-----------|------|------|
|           |      |      |

## Data flow
1. Client →
2. →
3. →

## Decisions
- **Decision:** ...
  **Why:** ...
  **Tradeoffs:** ...

## Open questions
- [ ]
`,
  },
  {
    id: 'changelog',
    label: 'Change Log',
    description: 'Dated change history',
    title: 'Change log: <thing>',
    content: `# Change log: <thing>

## ${new Date().toISOString().slice(0, 10)}
- Added:
- Changed:
- Removed:
`,
  },
];

export interface SnippetTemplate {
  id: string;
  label: string;
  language: SnippetLanguage;
  title: string;
  code: string;
}

export const SNIPPET_TEMPLATES: SnippetTemplate[] = [
  {
    id: 'systemd-service',
    label: 'systemd service',
    language: 'BASH',
    title: 'systemd service',
    code: `[Unit]
Description=<service description>
After=network.target

[Service]
Type=simple
User=<user>
WorkingDirectory=/opt/<app>
ExecStart=/opt/<app>/run.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target`,
  },
  {
    id: 'docker-compose',
    label: 'docker-compose service',
    language: 'YAML',
    title: 'docker-compose service',
    code: `services:
  <name>:
    image: <image>:<tag>
    container_name: <name>
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - TZ=UTC
    volumes:
      - ./data:/data
    networks:
      - lab

networks:
  lab:
    external: true`,
  },
  {
    id: 'k8s-deployment',
    label: 'Kubernetes deployment',
    language: 'YAML',
    title: 'k8s deployment',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: <name>
  namespace: <ns>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <name>
  template:
    metadata:
      labels:
        app: <name>
    spec:
      containers:
        - name: <name>
          image: <image>:<tag>
          ports:
            - containerPort: 8080`,
  },
  {
    id: 'backup',
    label: 'rsync backup script',
    language: 'BASH',
    title: 'rsync backup',
    code: `#!/usr/bin/env bash
set -euo pipefail

SRC="/srv/data/"
DST="user@backup-host:/backups/$(hostname)/"
LOG="/var/log/backup-$(date +%F).log"

rsync -aHAX --delete --info=stats2 "$SRC" "$DST" | tee "$LOG"`,
  },
  {
    id: 'health-check',
    label: 'Python health check',
    language: 'PYTHON',
    title: 'health check',
    code: `import sys
import requests

URL = "http://localhost:8080/health"

try:
    r = requests.get(URL, timeout=5)
    r.raise_for_status()
    print("OK", r.json())
except Exception as e:
    print("FAIL", e, file=sys.stderr)
    sys.exit(1)`,
  },
];
