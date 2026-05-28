# Agentic Accessibility Tools

**Author:** [Rob Pataki](<mailto:rob.pataki@valtech.com?subject=agentic a11y tools>)

**Last updated:** 28/05/2026

## A11y Design Review Agent POC

POC project exploring agentic image analysis based accessibility reviews.

**Uses an orchestrator agent and sub agents to:**

- Analyse a screenshot of a website, page design or UI component design
- Generate interactive, HTML based accessibility report
- Keep AI-generated content consistent between runs
- Capture information about AI model usage and processing time of subtasks

The POC proves that agentic image analysis works with consistent output and this tool already can bring value for designers and developers at early stages of design exploration to highlight potential and actual accessibility issues with the designs.

This tool can be further developed to use the "visual" analysis approach to explore a URL in the browser using Playwright. This approach theoretically can allow semantic and structural analysis that is not based on static DOM analysis and help with persona-driven test scenario generation and UX barrier and gap identification tasks. This would directly feed into the "level 2" automated testing strategy.

---

### Verdict

> 👍
> **The tool works great**, it is consistent at recognising semantic and structural UI elements and it raises accessibility concerns reliably. The generated reports are solid. The current end-to-end execution takes a little too long.

The orchestrator/sub-agent agent approach improved output quality and consistency, and moving from LLM generated HTML output to a Node script-based HTML generator massively sped up the tool.

---

### Bottlenecks

**A few bottlenecks have been identified affecting execution time:**

1. Using large images increases token use and analysis time without any additional value
2. Models with powerful reasoning capabilities take longer to execute the analysis, but not adding much more value
3. Bouncing tasks and multiple tool calls between sub agents adds significant amount of time to the process

> 💡
> By removing these bottlenecks it is possible to reduce the end-to-end execution time under 90 seconds for complex designs (currently 8 minutes), and 30 seconds for less complex ones (currently 2.5 minutes).

#### 1. Large images

**Problem:**

Large images slow down image analysis, cost more and bring no real benefit.

**Solution:**

A 3442x1894 image costs roughly 4-6x more tokens to process than a 1440x792 image, and the processing time scales similarly.

Halving the pixel dimensions of an image cuts the visual tokens by ~75%. In practice this alone typically reduces vision model latency by 40–60%.

> 💡
> Before the analyser agent starts, resize the image to fit within a 1440x1440px bounding box by its largest side. Use the existing `sis` CLI command.

#### 2. Not using the right model

**Problem:**

Some AI models such as GTP-5.4 and are

**Solution:**

For image analysis currently GPT-4o seems to be best. It's free, fast, consistent, is great at semantic accuracy and ui/ structural reasoning.

> 💡
> Set the image analyst agent's model to `GPT-4o (copilot)` in the frontmatter

```md
model: GPT-4o (copilot)
```

_Note:_ At the moment in VSCode it seems this is more of a request than a hard setting and Copilot can sometimes decide to use a different model to run the agent task.

#### 3. Sub-optimal use of sub-agents and tool calls

**Problem:**

Spinning up sub-agents and calling CLI commands separately cost unecessary extra time. The report generation is already handled by a Node script, and the image analysis is best done by the simplest AI model (GTP-4o), so a single agent can do the same job faster.

**Solution:**

> 💡
>
> 1. Move everything into a single agent that uses GTP-4o. No more sub-agents.
> 2. Group CLI commands together and use pipes to reduce the various tool spin/wait/execution times.

---

I want to rebuild this agent tool in a way that it's more efficient and simpler.

We will keep the image analyst agent and the orchestrator agent. The analyst's responsibilities remain unchanged. The orchestrator will be responsible for:

- overall orchestration (single agent exposed to the user)
- input validation
- create the folders and artifacts
- Convert the input image into design.jpg and proportionally scale it down to 1440px wide if the input image width is larger than 1440px
- liaise with the analyst sub-agent (enforfce JSON schema contract)
- report creation via Node generator script
- final validation

We'll create this update in a new branch and continue iterating until I am happy with the results.

---

## NPM Scripts

**Validate analysis JSON:**

```bash
npm run validate:analysis-json -- --json analysis.json
```

**Run unit tests:**

```bash
npm run test:scripts
```

**Run unit tests with coverage report:**

```bash
npm run test:scripts:coverage
```
