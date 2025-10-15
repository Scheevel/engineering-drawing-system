# Story Completion Prompt Template

**Author**: Claude (AI-generated workflow template, October 2025)

Use this prompt at the end of each story to update [completed-epics.md](completed-epics.md) and create a completion commit.

---

## 📋 Prompt to Use

```
Story {EPIC#}.{STORY#} is complete: {ONE-LINE DESCRIPTION}

Please:
1. Review git changes for this story (git diff, git status)
2. Update docs/completed-epics.md:
   - If this is the first story for a new epic, add the epic section
   - Add this story to the epic's "Stories Completed" list
   - Update "Key Files Created/Modified" if significant architecture changes
3. Create a completion commit with format:
   "Complete Story {EPIC#}.{STORY#}: {ONE-LINE DESCRIPTION}"
4. Show me the updated completed-epics.md section for verification

Example:
"Story 3.17 is complete: Add validation warnings for duplicate component dimensions

Please:
1. Review git changes for this story (git diff, git status)
2. Update docs/completed-epics.md:
   - Add story 3.17 to Epic 3's "Stories Completed" list
   - Update "Key Files Created/Modified" if needed
3. Create completion commit: "Complete Story 3.17: Add validation warnings for duplicate component dimensions"
4. Show me the updated completed-epics.md section"
```

---

## 🎯 What This Accomplishes

1. **Git Review**: Ensures all changes are accounted for
2. **Documentation Update**: Keeps completed-epics.md current with minimal effort
3. **Completion Commit**: Creates clean git history with story completion marker
4. **Verification**: Shows you the update before committing

---

## 📝 Example Workflow

### When You Finish Story 3.17

**You:**
> Story 3.17 is complete: Add validation warnings for duplicate component dimensions
>
> Please:
> 1. Review git changes for this story (git diff, git status)
> 2. Update docs/completed-epics.md:
>    - Add story 3.17 to Epic 3's "Stories Completed" list
>    - Update "Key Files Created/Modified" if needed
> 3. Create completion commit: "Complete Story 3.17: Add validation warnings for duplicate component dimensions"
> 4. Show me the updated completed-epics.md section

**Claude:**
> ✅ Story 3.17 completion summary:
>
> **Changes:**
> - Modified: `frontend/src/components/editor/ComponentDimensions.tsx` (+45 lines)
> - Modified: `frontend/src/services/api.ts` (+12 lines)
> - Added: `frontend/src/utils/dimensionValidator.ts` (new file)
>
> **Updated completed-epics.md:**
> ```markdown
> ### Stories Completed
> ...
> - **3.16**: Schema Change Audit Trail - Comprehensive audit logging for schema modifications
> - **3.17**: Validation Warnings for Duplicate Dimensions - Prevents data entry errors with real-time warnings
> ```
>
> **Committed:**
> ```
> Complete Story 3.17: Add validation warnings for duplicate component dimensions
> ```

---

## 🚫 What NOT to Do

**DON'T** create separate story documentation files. The combination of:
1. Git commits with story numbers in messages
2. Summary line in completed-epics.md
3. Git history (`git log --grep="Story 3.17"`)

...is sufficient. No story-3.17-validation-warnings.md file needed.

---

## 🔍 Finding Completed Stories Later

### View Story Summary
```bash
# See story summary in completed-epics.md
cat docs/completed-epics.md | grep -A2 "3.17"
```

### View Full Story History
```bash
# All commits for story 3.17
git log --all --grep="Story 3.17" --oneline

# Detailed commit messages
git log --all --grep="Story 3.17"

# See actual code changes
git log --all --grep="Story 3.17" -p
```

### View Story at Completion Time
```bash
# Find completion commit
git log --all --grep="Complete Story 3.17" --oneline
# Example output: a1b2c3d Complete Story 3.17: Add validation warnings...

# View codebase at that moment
git show a1b2c3d
```

---

## 🎯 Benefits

1. **Minimal Overhead**: One prompt, done in ~30 seconds
2. **Git is Source of Truth**: No duplicate documentation to maintain
3. **Easy Discovery**: `completed-epics.md` provides roadmap, git provides details
4. **Clean History**: Story completion commits create natural milestones
5. **No Archive Maintenance**: No moving files, no archive index updates

---

**Philosophy**: Document epic summaries for context, use git for story details.
