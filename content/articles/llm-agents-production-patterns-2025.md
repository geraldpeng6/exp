---
title: LLM Agents in Production (2025): Practical Patterns That Survive Contact with Reality
date: 2025-08-23T00:00:00.000Z
summary: A practitioner’s guide to deploying LLM agents that are reliable, observable, and cost‑aware — covering orchestration, memory, tools, evaluation, and failure handling.
tags: [AI, LLM, Agents, Production]
---

# LLM Agents in Production (2025): Practical Patterns That Survive Contact with Reality

Shipping an agent is easy; operating one is hard. After a year of building and maintaining agentic systems in real products, these are the patterns that consistently worked — and the traps we learned to avoid.

## 1) Prefer simple loops over deep trees

- Start with a single decision loop: perceive → plan → act → reflect.
- Constrain tool surface and decision breadth explicitly (max tools per turn, max plan tokens, max turns).
- Promote deterministic subroutines (regexp, JSON schema validation, small DSLs) before adding another LLM call.

## 2) Structured I/O or it didn’t happen

- Always specify a JSON schema and validate strictly.
- Fail fast on schema mismatch; auto‑repair once; then escalate.
- Use function/tool calling with typed arguments; log raw model output for forensics.

## 3) Memory is a product decision

- Separate short‑term scratchpad from long‑term knowledge.
- Use task‑scoped ephemeral memory; checkpoint only the minimal state required to resume.
- Long‑term memory: store facts, not chats. Periodically compact with summarization + retrieval tests.

## 4) Retrieval is a contract

- Treat RAG as an API: inputs (query, constraints), outputs (citations, confidence), and SLAs (latency, recall@k).
- Evaluate chunking, embedding, and ranking with task‑level metrics, not just vector sim.
- Force citations into the final answer; penalize uncited claims during eval.

## 5) Observability first

- Trace every step (prompt, tool inputs/outputs, token counts, latencies).
- Redact secrets at the boundary; keep an encrypted raw log sink for incident response.
- Define “golden paths” and continuously replay them after model or prompt changes.

## 6) Cost/latency budgets are guardrails, not vibes

- Pre‑budget tokens per request and enforce hard caps.
- Use small models for routing, extraction, and light planning; reserve big models for hard synthesis.
- Cache aggressively: prompt‑cache, embedding‑cache, tool‑result cache with TTL.

## 7) Safety is layered

- Static filters (regex/keyword) → LLM policies → human escalation for sensitive actions.
- Prefer allow‑lists for tools that can write, delete, spend, or message.
- Build “dry‑run” modes for every tool and keep them on by default in staging.

## 8) Evaluation you actually run

- Unit tests for tools and deterministic helpers.
- Scenario suites for end‑to‑end tasks with asserted outputs and citations.
- Shadow traffic and canary rollouts when changing models or prompts.

## 9) Failure handling is the UX

- Timeouts are outcomes; define them. Return partial work with citations and a retry token.
- Make retries idempotent; persist task IDs and tool traces.
- Offer a “show work” panel so support and power users can self‑diagnose.

## 10) Change management

- Treat prompts as code: version, review, test, rollback.
- Document model/parameter changes in release notes.
- Keep a minimal, boring baseline agent you can always revert to.

### References and inspiration

We took inspiration from recent articles on Medium about agent design patterns, evaluation, and observability in 2025. This post is original writing based on those ideas and our practice.

