---
title: "Basic Mermaid Test"
description: "Test file for basic mermaid diagram rendering"
---

# Basic Mermaid Test

This test verifies that mermaid diagrams are correctly processed and rendered.

## Simple Flowchart

```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!
    A->>B: Let's work together
    B-->>A: Sounds good!
```

## Pie Chart

```mermaid
pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
``` 