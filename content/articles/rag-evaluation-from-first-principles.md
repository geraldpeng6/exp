---
title: RAG Evaluation from First Principles
date: 2025-08-23T00:00:00.000Z
summary: A compact, practical method to measure whether your retrieval‑augmented generation system helps users — not just vectors.
tags: [AI, LLM, RAG, Evaluation]
---

# RAG Evaluation from First Principles

Most RAG evals measure embeddings, not outcomes. Here’s a lightweight approach that correlates with product reality.

## Define tasks, not queries

- Pick 10–30 real user tasks. Each task has: goal, inputs, constraints, acceptance criteria, and gold references.
- Create synthetic but realistic variants to stress retrieval brittleness.

## Measure the right things

- Answer quality: graded on acceptance criteria by humans or a strong judge model.
- Grounding: percent of claims with citations that point to the right passages.
- Retrieval quality: recall@k on gold passages, MRR or nDCG for ranking.
- System metrics: latency P95, tokens in/out, tool error rate.

## Keep it cheap and runnable

- Freeze seeds; keep suites small and frequent.
- Use a small local model as a judge to prefilter; escalate disagreements to a stronger model.
- Make the suite a single command in CI that fails fast on regression.

## Close the loop

- Log live failures; turn them into new tasks in the suite.
- Track a small dashboard over time; block releases when grounding dips.

### References and inspiration

This article is original content inspired by recent Medium posts on RAG evaluation and observability.

