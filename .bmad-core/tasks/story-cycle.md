<!-- Powered by BMAD™ Core -->

# Story Implementation Cycle Task

## Purpose

Execute the complete SM → Dev → QA cycle for a single story, automating the repetitive workflow while maintaining quality checkpoints.

## Required Parameters

- **story_number**: The story to implement (e.g., 3.5, 4.2)

## Context Requirements

This task requires access to:
- Sharded PRD documents in `docs/prd/`
- Architecture documents in `docs/architecture/`
- Existing stories in `docs/stories/`
- Source code for implementation

## Instructions

### Phase 1: Story Creation (SM Agent Role)

**Adopt SM Agent Mindset**: You are now the Scrum Master, focused on creating clear, implementable user stories.

1. **Locate Epic Context**:
   - Identify which epic story {story_number} belongs to
   - Load the relevant `docs/prd/epic-*.md` file
   - Review any related architecture documents

2. **Execute Story Creation**:
   - Follow the create-next-story task workflow
   - Generate story {story_number} with all required sections:
     - User Story
     - Acceptance Criteria
     - Tasks and Subtasks
     - Technical Notes
     - Dependencies
   - Save to `docs/stories/story-{story_number}.md`

3. **Present for Approval**:
   - Display the complete story to the user
   - Highlight key implementation points
   - **PAUSE** and wait for user approval before proceeding
   - If changes requested, iterate until approved

4. **Mark Status**: Set story status to "Approved"

---

### Phase 2: Development (Dev Agent Role)

**Adopt Dev Agent Mindset**: You are now the Developer, focused on clean implementation following coding standards.

5. **Load Development Context**:
   - Read `docs/stories/story-{story_number}.md`
   - Load always-required files:
     - `docs/architecture/coding-standards.md`
     - `docs/architecture/tech-stack.md`
     - `docs/architecture/source-tree.md`
   - Review technical notes and dependencies

6. **Update Story Status**: Change status from "Approved" to "InProgress"

7. **Implement Tasks Sequentially**:
   - Work through each task and subtask in order
   - Mark each subtask complete as you finish
   - Follow all coding standards and patterns
   - Write tests for new functionality
   - Update File List section with all changes

8. **Verification**:
   - Run all tests and ensure they pass
   - Verify acceptance criteria are met
   - Check for any console errors or warnings

9. **Mark for Review**: Change status to "Review"

10. **Summarize Changes**:
    - List all files created or modified
    - Highlight key implementation decisions
    - Note any technical debt or future improvements

---

### Phase 3: QA Review (QA Agent Role)

**Adopt QA Agent Mindset**: You are now the QA/Senior Developer, focused on code quality and best practices.

11. **Load Review Context**:
    - Read `docs/stories/story-{story_number}.md`
    - Review all files in the File List
    - Check acceptance criteria

12. **Execute Senior Code Review**:
    - Review code quality and adherence to standards
    - Check test coverage and quality
    - Verify acceptance criteria are fully met
    - Look for potential bugs or edge cases
    - Identify refactoring opportunities

13. **Perform Refactoring** (if needed):
    - Improve code quality directly
    - Enhance test coverage
    - Apply best practices
    - Document changes in QA Results

14. **Append QA Results**:
    - Add comprehensive review to story's QA Results section
    - Include:
      - ✅ Passed criteria
      - 🔧 Improvements made
      - ⚠️ Any concerns or technical debt
      - 📝 Recommendations

15. **Final Status Update**:
    - If all criteria met: Change status to "Done"
    - If issues found: Keep status as "Review" and list required changes
    - **PAUSE** and present QA results to user for final approval

---

## Success Criteria

- [ ] Story file exists in `docs/stories/`
- [ ] All tasks and subtasks completed
- [ ] Acceptance criteria fully met
- [ ] All tests passing
- [ ] Code reviewed and approved by QA
- [ ] Story status is "Done"
- [ ] User has approved completion

## User Checkpoints

This task has **TWO required approval points**:

1. **After Story Creation**: User reviews and approves story before implementation
2. **After QA Review**: User reviews QA results and approves story completion

## Output

- **Story File**: `docs/stories/story-{story_number}.md` (Status: Done)
- **Source Changes**: All implemented features and tests
- **QA Report**: Comprehensive review appended to story

## Usage Example

```
@bmad-master execute story-cycle 3.5
```

This will:
1. Create story 3.5 (wait for approval)
2. Implement story 3.5
3. Review story 3.5 (wait for final approval)

## Notes

- This task maintains the clean context principle by having one agent embody multiple roles
- Each phase follows the standard workflow but in a single session
- User approval gates ensure quality control
- The File List is critical for QA to know what to review
