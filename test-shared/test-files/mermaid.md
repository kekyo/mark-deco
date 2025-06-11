---
title: Mermaid Plugin Test
description: Test file for mermaid plugin functionality
author: Test User
date: 2024-01-01
tags: [mermaid, diagram, test]
---

# Mermaid Plugin Test

This test verifies that the mermaid plugin processes diagrams correctly.

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

## Class Diagram

```mermaid
classDiagram
    class Animal{
        +int age
        +String gender
        +isMammal()
        +mate()
    }
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    Animal <|-- Duck
```

This should create proper HTML elements that mermaid.js can render as SVG diagrams. 