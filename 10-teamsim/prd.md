# Product Requirements Document  
**Project:**  *FlowLab* – Streamlit “what‑if” simulator for product‑development flow  
**Author:**   <your name>  
**Date:**     2025‑04‑21  
**Status:**   Draft ▶ PR ✅  

---

## 1  Purpose

Give leaders a hands‑on, visual playground where they can vary a few key levers of agile product development (batch size, WIP limit, feedback delay, test automation, etc.) and instantly see how flow‑time, quality, and value change.  
The tool should **teach core flow principles through experiment**, not theory slides.

---

## 2  Background & Motivation

* Execs often mis‑grasp abstract ideas like “cost of delay” or “Little’s Law”.  
* Detailed person‑level sims are noisy; we only need three functional work‑centres (Design, Build, Test) to expose the trade‑offs.  
* Streamlit lets us ship a one‑file interactive app that runs in Cursor, Codespaces, or a browser.

---

## 3  Goals / Non‑Goals

| Goals (MVP) | Non‑Goals |
|-------------|-----------|
| • Adjustable parameters via sliders / selects | • Per‑person calendars or Jira sync |
| • Instant run (<2 s) and auto‑charts | • Generating real production code |
| • LLM “Narrator” panel that explains results | • Multiplayer or persistent login |
| • Download‑to‑CSV of run logs | • Fancy 3‑D animations |

---

## 4  Target Users

1. **C‑level / VPs** – need intuition for flow metrics.  
2. **Coaches / trainers** – run live workshops, swap scenarios.  
3. **Product/Eng leads** – test policy ideas (WIP caps, test coverage).

---

## 5  User Stories (MVP)

1. *As a VP*, I drag a **Batch Size** slider from 1→10 and instantly see lead‑time and throughput change.  
2. *As a coach*, I toggle a **Feedback Delay** to 10 days and show how quality crashes.  
3. *As a lead*, I download the run log to CSV to craft my own deck.  
4. *As anyone*, I click **“Explain run”** and get a crisp English post‑mortem from the Narrator LLM.  

---

## 6  Simulation Design

### 6.1 Entities & State

| Entity | Attributes |
|--------|------------|
| **Feature** | `state` (Design → Build → Test → Done), `value`, `complexity` |
| **Pods**    | `capacity` (hours/iter), `wip_limit`, `policy()` |
| **World**   | `day`, queues, `quality_debt`, `metrics` dict |

### 6.2 Parameters (exposed as UI controls)

| Control (var) | Range | Default |
|---------------|-------|---------|
| Batch size (B) | 1‑20 | 5 |
| WIP limit per pod (W) | 1‑10 | 4 |
| Feedback latency days (L) | 0‑15 | 3 |
| Automated test coverage % (T) | 0‑90 | 40 |
| Feature uncertainty p(fail) (U) | 0‑0.8 | 0.3 |
| Sim length (iterations) | 5‑50 | 20 |

### 6.3 Process Flow

Need arrives → generate B features
For each day:
• Design pod pulls ≤ W items; each finishes in N(μ_design, σ)
• Build pod pulls …                       N(μ_dev,    σ)
• Test pod pulls …                        N(μ_test,   σ*(1‑T))
• Bugs reinject features to Build queue
• After L days post‑release ⇒ customer value feedback

### 6.4 Metrics Captured

* Lead‑time per feature  
* Throughput / iteration  
* Rework rate  
* Cumulative customer value  
* Idle‑time % per pod  
* Token/cost (LLM usage)

---

## 7  User Interface / UX

```mermaid
flowchart TD
    A[Sidebar controls] --> B[Run button]
    B --> C[(Sim kernel)]
    C --> D[Charts: lead‑time, CFD, value curve]
    C --> E[Narrator (LLM markdown)]
    C --> F[Download CSV]

7.1 Streamlit Layout
	•	Sidebar – sliders & selects; run/stop; scenario presets dropdown.
	•	Main column
	•	Tabs: Metrics, Flow Diagram, Narrator
	•	Metrics tab:
	•	Line chart – lead‑time vs. iteration
	•	Bar chart – throughput
	•	Table – top‑level KPI snapshot
	•	Narrator tab: markdown block with LLM explanation + “ask why” text‑input.

7.2 Interactions
	•	Changing any slider greys out charts until user presses Run (avoid accidental spam).
	•	Streamlit st.session_state holds last results to enable diff view (“compare with previous”).
	•	Footer badge: version, last GPT cost.

⸻

8  Technical Architecture

Layer	Impl
Sim kernel	Pure Python ‑¹  (SimPy or hand‑rolled event loop)
UI	Streamlit ≥ 1.32
LLM Narrator	OpenAI gpt‑4o via asyncio call → ~1‑2 K tokens/run
Charts	st.line_chart, st.bar_chart, plotly for CFD
Packaging	Single streamlit_app.py; all deps in requirements.txt

¹ Must finish a 50‑feature, 20‑iteration run in < 0.5 s on laptop.

⸻

9  Non‑Functional Requirements
	•	Performance: ≤ 2 s total wall‑time per run (incl. LLM).
	•	Cost: <$0.02 / run at default settings.
	•	Portability: no external DB; optional pip install . && streamlit run.
	•	Accessibility: color‑blind‑safe palettes; keyboard nav.
	•	Reliability: graceful fallback if LLM fails → show metrics minus narrative.

⸻

10  Out‑of‑Scope (for v1)
	•	Authentication / multi‑user storage
	•	Persisting scenario history across sessions
	•	Custom LLM fine‑tuning
	•	Person‑level agent modeling

⸻

11  Open Questions
	1.	Which cost model to display (token $ vs. abstract “effort points”)?
	2.	Should Narrator run automatically after every simulation or on‑demand?
	3.	Preset scenario library: include classic Spotify model, overloaded QA, etc.?
	4.	Does the exec audience need export to PowerPoint/PNG?

⸻

12  Milestones & Timeline (ideal)

Date	Deliverable
T + 0 d	PRD approved (this doc)
T + 3 d	Kernel + CLI runs, unit‑tested
T + 5 d	Streamlit UI v0 (no LLM)
T + 7 d	LLM Narrator integrated, cost guardrails
T + 9 d	Polishing: presets, compare‑runs diff
T + 10 d	Internal demo & feedback
T + 12 d	v1.0 tag, README, Dockerfile



⸻

13  Acceptance Criteria
	1.	Run a default scenario and observe charts rendered & Narrator summary without error.
	2.	Changing any single parameter shows materially different metrics.
	3.	LLM summary highlights at least one actionable insight (> 300 chars).
	4.	Downloaded CSV reproduces the plotted metrics.
	5.	End‑to‑end cost at defaults < $0.02 and runtime < 2 s on M‑class MacBook.


