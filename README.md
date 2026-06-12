# 🤖 Multi-Agent Autonomous Research Engine

A high-performance, asynchronous multi-agent orchestration pipeline built using **CrewAI**, **LiteLLM**, and **Python**. This intelligence engine leverages three specialized AI agents working sequentially to automate deep-dive web mining, quantitative data filtering, and high-quality report synthesis on any targeted technical domain.

---

## 🚀 Key Framework Capabilities

* **Tri-Agent Collaborative Pipeline:** Orchestrates a sequential workflow across three micro-specialized roles.
* **Deep Web Scraping:** Integrated with `SerperDevTool` for autonomous, multi-query live internet extraction.
* **Asynchronous Runtime Matrix:** Built on Python’s native `asyncio` event loop architecture to handle complex sub-tasks natively.
* **OpenAI Compliant Architecture:** Uses custom `extra_headers` sanitization to prevent unauthorized payload variables like unsupported system-level cache breakpoints.

---

## 📊 System Topology & Agent Workflow

The production pipeline enforces a strict, data-validated sequential execution layout:

[ User Input / Core Prompt ]
             │
             ▼
 ┌──────────────────────┐
 │ 1. Researcher Agent  │  ◄── Executes deep web queries via Serper Dev API
 └───────────┬──────────┘
             │ (Raw Research Output)
             ▼
 ┌──────────────────────┐
 │ 2. Data Analyst Agent│  ◄── Filters anomalies, extracts metrics & validates facts
 └───────────┬──────────┘
             │ (Structured Contextual Data)
             ▼
 ┌──────────────────────┐
 │  3. Writer Agent     │  ◄── Synthesizes raw technical reports into brief layouts
 └───────────┬──────────┘
             │
             ▼
[ Production-Ready Document ]


---

## 👥 The Intelligence Crew

| Agent Role | Core Focus | Primary Tooling Stack |
| :--- | :--- | :--- |
| **Senior Research Analyst** | Raw information harvesting & deep web scanning | `SerperDevTool`, Google Scrapers |
| **Data Analyst** | Quantitative verification, fact-checking, and indexing | Internal Processing, Data Structuring |
| **Technical Writer** | Audience-specific layout framing & brief synthesis | Production-Level LLM Synthesis |

---

## 📋 System Prerequisites

Ensure your environment satisfies the following baseline requirements before initiating runtime kickoff:
* **Python Engine:** Version `3.10` to `3.12` installed.
* **API Credentials:** Valid token access keys for both OpenAI and Serper.

---

## ⚙️ Installation & Sandbox Setup

1. **Navigate to your local backend repository directory:**
   ```bash
   cd D:/AI-Projects/LLM/Research-Agent/Backend