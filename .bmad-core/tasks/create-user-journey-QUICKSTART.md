# Quick Start: Create User Journey Task

## 🎯 What This Does

After a dev story is **approved** but **before development starts**, this task creates a concise, visual narrative showing step-by-step how a user will interact with the new feature.

**Think of it as:** A movie script for your feature - every user action, every system response, every decision point.

---

## 🚀 Three Ways to Use It

### Option 1: Simple Task Execution (Fastest)

```bash
/BMad:agents:bmad-orchestrator *agent po
*task create-user-journey
```

You'll be prompted for:
- Story ID (e.g., "9.1")
- Story title
- Feature name
- User persona
- User goal

Then follow the step-by-step prompts to build the journey.

---

### Option 2: Template-Driven (Most Structured)

```bash
/BMad:agents:bmad-orchestrator *agent po
*task create-doc

# When prompted for template, choose:
user-journey-tmpl
```

This uses the YAML template with elicitation methods, giving you:
- Interactive section-by-section creation
- 1-9 option menus for refinement
- Automatic Mermaid diagram generation
- Quality checks at each step

---

### Option 3: Direct Agent Command (For Regular Use)

Once you're familiar, assign to your PO agent:

```bash
/BMad:agents:po *task create-user-journey docs/stories-archive/story-9.1-search-ui-column-based-filtering.md
```

---

## 📋 When to Use This

✅ **DO create user journeys for:**
- New features with UI changes
- Multi-step workflows (checkout, onboarding)
- Features with user decisions
- Complex interactions (drag-drop, file upload)

❌ **DON'T create for:**
- Backend-only changes (API refactoring)
- Infrastructure work (database migrations)
- Pure code refactoring (no UX change)

---

## 📂 Where Files Go

**Created files go to:** `docs/user-journeys/`

Format: `journey-{story-id}-{slug}.md`

Example: `journey-9.1-excel-column-filtering.md`

---

## 👀 Example Output

Check out the example I created for Story 9.1:

**File:** [docs/user-journeys/journey-9.1-excel-column-filtering-EXAMPLE.md](../../../docs/user-journeys/journey-9.1-excel-column-filtering-EXAMPLE.md)

This shows the full format including:
- Context (why user needs this)
- Step-by-step flow (every click and response)
- Decision points (where users choose)
- Edge cases (errors, empty states)
- Visual Mermaid diagram
- Acceptance criteria mapping

---

## 🔄 Integration with Your Workflow

```
Story Drafted
    ↓
PO Reviews & Approves
    ↓
📍 CREATE USER JOURNEY ← You are here!
    ↓
Team reviews journey (Dev validates feasibility, QA plans tests)
    ↓
Dev starts implementation
    ↓
QA uses journey for acceptance testing
```

---

## 🎓 Pro Tips

1. **Keep it concise**: Aim for 1-3 pages max
2. **Be specific**: "User clicks 'Type' column header" not "User filters results"
3. **Show what user SEES**: Not internal logic or backend behavior
4. **Include screenshots reference**: Link to mockups in the story if available
5. **Test the journey**: Can someone follow it without seeing the code?

---

## 🛠️ Configuration (Optional)

To customize default paths, edit `.bmad-core/core-config.yaml`:

```yaml
docs:
  userJourneys: "docs/ux/user-journeys/"  # Custom path
```

---

## 🤝 Who Should Create This?

**Primary:** Product Owner (PO)
- Knows user needs and business context

**Can also be:**
- UX Designer (if on team)
- Scrum Master (facilitating with PO)

**Should review:**
- Dev team (validate feasibility)
- QA (inform test planning)

---

## 🆘 Troubleshooting

**Q: The task asks for story_path but I have a story ID**

A: Provide the full path to the story markdown file:
```
docs/stories-archive/story-9.1-search-ui-column-based-filtering.md
```

**Q: Can I skip the Mermaid diagram?**

A: Yes! When using the template, answer "no" to `include_visual` prompt.

**Q: The journey is getting too long (5+ pages)**

A: You might be documenting multiple user journeys. Split into separate tasks:
- Journey A: New user first-time setup
- Journey B: Returning user quick task
- Journey C: Admin configuration

**Q: What if the story changes during development?**

A: Update the journey file! It's a living document. Treat it like code - keep it in sync.

---

## 📚 Related Tasks

- `create-next-story` - Create the dev story first
- `review-story` (Quinn) - QA uses journey for acceptance testing
- `test-design` - Create test cases from journey steps

---

## 🎉 Success Looks Like

After creating a user journey, your team should:
- ✅ Have a shared mental model of the user experience
- ✅ Know exactly what to build (Dev)
- ✅ Know exactly what to test (QA)
- ✅ Be able to explain the feature to stakeholders (PO)

**If anyone says "wait, what are we building again?" - the journey needs work!**
