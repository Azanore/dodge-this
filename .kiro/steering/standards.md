---
inclusion: always
---

## Code Quality & Style

**Minimalism First**: Write minimal, functional code with no verbosity or defensive programming. This is non-negotiable.

**Naming Conventions**:
- PascalCase for classes
- camelCase for variables and functions
- Self-explanatory names (length doesn't matter)
- File names indicate single purpose

**Code Organization**:
- Config variables at the top with comments
- Extract magic numbers into named constants
- Keep functions focused (target <20 lines)
- Remove dead code, unused imports, and orphaned files after changes
- Remove duplicate/unused functions when adding new ones

**Error Handling**:
- No silent failures or null returns
- Fail explicitly with clear error messages

## Documentation

**Comments**:
- Single comment above each function/class/complex logic describing purpose
- Inline comments for medium-to-high complexity logic only
- File header comment: purpose, related files/classes/functions, what it shouldn't include

**Logging**:
- Add logs only when absolutely necessary
- Avoid defensive logging

**Documentation Files**:
- Do not create documentation or summary files
- Share notes, change summaries, and analysis directly in chat
- Only create/update docs when explicitly requested
- Update `CONTEXT.md` after any session that fixes a bug, adds a feature, or makes an architectural decision — add a changelog entry and update the relevant section

## Architecture & Patterns

**Consistency**:
- Follow existing coding patterns from other files
- Reuse existing patterns; don't refactor beyond targeted area
- Align folder structure, features, coding patterns, schemas, and rules

**YAGNI Principle**:
- You Aren't Gonna Need It — build only what's needed now
- Avoid over-engineering and premature optimization

**Refactoring**:
- No logic changes during refactoring, only structural improvements
- Extract repeated patterns into utilities only when judged important
- Mention refactoring opportunities after completing tasks

**Component Changes**:
- Target only the affected element, not shared/dependent components
- Prefer changing one over changing all
- Never touch code outside the targeted area, even if it looks wrong — flag it as a separate observation instead

## Development Workflow

**Before Coding**:
- Read related files to understand context, dependencies, and patterns
- Analyze everything related to the problem
- Confirm issues exist and clarify them before implementing solutions
- State the blast radius: explicitly identify which files will change and which will not

**During Coding**:
- Make minimal, well-thought-out changes
- Don't break existing functionality
- Reuse what's reusable when adding features
- Maintain feature independence
- One task at a time — never combine a bug fix with a feature addition in the same response

**After Coding**:
- Provide clear before/after differentiation for validation
- State what could break and what should be tested as a result of the change
- Mention what can be refactored
- After completing each task, run: `git add . ; git commit -m "<task description>" ; git push origin master`

**On Ambiguity**:
- If something is unclear or context is missing, ask one focused question before proceeding
- Never assume and silently fill gaps — state the assumption explicitly and confirm it first

## Critical Thinking & Challenge

**Never Accept Blindly**: Analyze, investigate, critique, and reason about every request and idea.
- Question assumptions and proposed solutions
- Evaluate against: UX simplicity, flexibility, usability, feature value, scope creep, complexity
- Propose alternatives if the request has issues
- Push back when something adds unnecessary complexity or doesn't serve users

**Priority Order** (highest to lowest):
1. User Experience — simplicity, usability, intuitive flow
2. Feature Value — does it solve a real problem?
3. Scope Control — does it fit the vision? Is it scope creep?
4. Implementation Complexity — effort vs. value ratio
5. Flexibility — can it adapt without over-engineering?

**When to Push Back**:
- Feature doesn't align with core value proposition
- Adds complexity without proportional user benefit
- Creates maintenance burden for edge cases
- Better alternative exists that's simpler or more effective
- Request conflicts with established design decisions

## UI Development

**Layout Precision**:
- For fixed-size layouts, ensure pixel-perfect containers
- Total width/height of children (including padding, borders, margins) must match container dimensions

## Platform-Specific

**Windows Environment**:
- Use Windows-friendly PowerShell commands
- Use `;` instead of `&&` for command chaining
- Use file tools for creation, not shell commands

## Security
- Never hardcode secrets or sensitive data
