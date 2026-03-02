Title: ADR 001: Tech Stack, Language, and Deployment Strategy

Date: 2026-03-02

Status: Accepted

1. Context & Problem Statement We need to establish a technology stack for a complex, system-driven game (a deep-sea, FTL-like experience). The stack must satisfy two potentially conflicting requirements:

Vibe-Coding Compatibility: The codebase must be highly modular to accommodate the context window limits of Large Language Models (LLMs). The programming language must be one that LLMs can generate with high reliability and minimal errors.

Frictionless Deployment: The game must be easily testable and distributable to players without complex CI/CD pipelines, executable files (.exe/.app), or operating system hurdles. It must be hostable as a static site via Netlify.

2. Decision We will proceed with the following setup:

Programming Language: TypeScript (Strict Mode enabled).

Rendering / Engine: Vanilla HTML5 Canvas API (with the option to upgrade to PixiJS for WebGL hardware acceleration if needed). We will intentionally avoid heavy, UI-based engines like Unity or Godot.

Build Tool / Bundler: Vite.

Project Language (Naming & Docs): English.

3. Rationale * Why TypeScript? LLMs excel at writing TypeScript. The strict typing system (Interfaces, Types) acts as a guardrail, forcing the AI to respect contracts between modules. If the AI changes a variable in Module A, the TypeScript compiler will immediately flag if it breaks Module B, preventing cascading errors.

Why Web/Vite? Vite allows for a highly modular, multi-file folder structure during development, which is perfect for isolating context for the AI. During the build process, Vite bundles these hundreds of files into highly optimized, static HTML/JS/CSS files. These can be dragged and dropped into Netlify for zero-friction deployment.

Why no Game Engine? Separating game data, core engine logic, and UI via an Entity-Component-System (ECS) in pure code is much easier to manage via text-based prompts. If we used Unity or Godot, the AI would struggle to manipulate proprietary, binary-like scene files.

4. Consequences * Positive: We achieve a sub-second local development loop (save -> auto-reload). We can share the game instantly via a web link. The AI has clear boundaries and strict typing to prevent hallucinations.

Negative/Risk: We have to build the foundational core systems (game loop, delta time calculation, asset loading) ourselves from scratch. However, this risk is heavily mitigated by leveraging the LLM to generate these standard boilerplate systems.