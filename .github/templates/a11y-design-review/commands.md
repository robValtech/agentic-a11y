## Shared commands

### `CMD_TIMESTAMP(label)`

Run `node -e "console.log(Date.now())"` and store the result in the session timing object under the key `label`. The timing object looks like:

```json
{
"job_start": 1778241068141,
...
}
```

Hold this object in memory — it will be included in the final output.

### `CMD_AGENT_NAME`

Output the currently used AI agent model (e.g. "GPT-4.1 (copilot)").

### `CMD_AGENT_MODEL(label)`

Store the currently used AI agent model (e.g. "GPT-4.1 (copilot)") in the model object under the key `label`. The model object looks like:

```json
# example
{
  "orchestrator": "GTP-4o (copilot)",
  ...
}
```

Hold this object in memory and recall it when instructed.
