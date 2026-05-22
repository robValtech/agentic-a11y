---
description: "Agent to test output session storage and node stdout values to chat window"
tools: [execute]
argument-hint: "yoyo = run me"
---

When the user prompt matches the following text exactly: "yoyo", you will run the workflow. If the prompt contains any other text or only partially matches "yoyo" you will not do anything.

Each time you are prompted you will run the workflow regardless how many times it ran before.

## Workflow

Store the user's prompt as `userPrompt`.

### Run this script

```bash
  TS_START=$(node -e "console.log(Date.now())") && \
  echo START TIMESTAMP:  $TS_START && \
  TS_FOLDER=$(node -e "console.log(new Date())") && \
  echo FOLDER TIMESTAMP: $TS_FOLDER
```

### Get the current agent and model

Store the current AI agent as `harness`.

Store the current AI model as `model`.

### Output

| Item             | Value        |
| ---------------- | ------------ |
| Timestamp        | `$TS_START`  |
| Folder Timestamp | `$TS_FOLDER` |
| Prompt           | `userPrompt` |
| Harness          | `harness`    |
| Model            | `model`      |
