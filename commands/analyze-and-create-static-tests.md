---
Description: Analyzes the codebase for missing static type tests and then creates them sequentially.
---

invoke the orchestrator-agent with this special prompt:

```
1. **Phase 1: Analysis**
   - Invokes the `static-test-absence-detector` agent
   - Analyzes all TypeScript files for missing compile-time type tests
   - Generates a comprehensive report with `missing_coverage_analysis`, `metrics`, and `metadata`
   - Saves the analysis to `reports/{session_id}/static-test-absence-detector-summary.json`

2. **Phase 2: Sequential Test Creation**
   - Reads the generated analysis report
   - For each file in `critical_gaps`, then `moderate_gaps`, then `minor_gaps`:
     - Invokes the `static-test-creator` agent with specific instructions
     - Creates static tests ONLY for the types specified in the analysis
     - Waits for completion before moving to the next file

3. **Phase 3: Build**
    - Invoke the builder and make sure the project can build.
    - Create a summary of failing tests and the reason for that
```