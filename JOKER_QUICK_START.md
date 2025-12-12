# 🃏 Joker Card - Quick Start

## What is Joker Card?

The **Joker (J)** is a voting option that means: **"I'm here and counted as voted, but my vote doesn't affect the estimate."**

## When to Use

| Situation | Use? | Why |
|-----------|------|-----|
| You have no context | ✅ **YES** | Joker lets you abstain without holding up consensus |
| You think it's simple | ❌ **NO** | Give your honest estimate (1-16) |
| You're unsure | ✅ **MAYBE** | If truly uncertain, Joker; if leaning toward a number, pick it |
| Meeting time is short | ✅ **YES** | Joker avoids "I don't know" delays |
| You're team lead rating others | ✅ **YES** | Let the team estimate their work |

## How It Works

### For Voters

1. **Click "J" button** instead of a number
   ```
   [1] [2] [4] [8] [16] [J] ← Select J
   ```

2. **Submit vote**
   ```
   Vote submitted: "J (Joker)"
   You're marked as voted ✓
   ```

3. **Consensus is calculated WITHOUT your vote**
   ```
   Votes:   [4, 4, 8, J]
   Counted: [4, 4, 8]  ← Only these affect estimate
   Result:  4-5 points consensus
   ```

### For Teams

**Old Way:**
```
Team 1: "I don't know" ⟳ Stops meeting
Facilitator: "Just guess"
Team 1: "8?" ⟳ Skews data
```

**With Joker:**
```
Team 1: *clicks J* ⟳ Continues immediately  
Team 2: "I estimate 4"
Team 3: "4"
Team 4: "8"
Consensus: 4-5 points (Team 1's Joker ignored)
```

## Examples

### Example 1: New Feature Discussion

**Scenario**: Sprint Planning for feature "Implement OAuth2"

| Role | Vote | Notes |
|------|------|-------|
| Backend Lead | 8 | Familiar with auth |
| Frontend Dev | 8 | Also familiar |
| **DevOps** | **J** | ✓ Not implementing, just watching |
| QA | 8 | Knows test scenarios |

**Result**: Consensus 8 points (DevOps Joker ignored)

### Example 2: Conflicting Opinions

**Scenario**: "Optimize database query"

| Dev | Vote | Notes |
|-----|------|-------|
| Database Expert | 4 | Clear optimization path |
| New Member | 16 | Doesn't understand fully |
| Tech Lead | **J** | "Let database expert decide" |
| QA | 4 | Testing confirms it's simple |

**Result**: Consensus 4 points (consensus on actual experts, Lead abstains to avoid authority bias)

### Example 3: All Jokers = No Estimate

**Scenario**: "Migrate legacy auth system"

| Team Member | Vote | Notes |
|-------------|------|-------|
| Dev 1 | J | Legacy system archaic |
| Dev 2 | J | Need architecture discussion |
| Dev 3 | J | Depends on requirements |
| PM | J | Waiting for decision |

**Result**: ❌ **No Consensus** → Need more info/discussion before estimating

## API Details (for developers)

### Submit Joker Vote

```bash
curl -X POST http://localhost:8000/api/v1/estimates/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_id": 1,
    "issue_id": 1,
    "story_points": 0,
    "user_id": 1,
    "is_joker": true
  }'
```

### Response

```json
{
  "id": 42,
  "issue_id": 1,
  "user_id": 1,
  "story_points": 0,
  "is_joker": true,
  "created_at": "2025-12-12T14:50:00Z",
  "updated_at": "2025-12-12T14:50:00Z"
}
```

### Estimate Summary (Shows Joker Count)

```bash
GET /api/v1/estimates/summary/1
```

```json
{
  "issue_id": 1,
  "total_estimates": 4,     ← 4 people voted
  "valid_estimates": 3,     ← 3 gave numbers
  "joker_count": 1,         ← 1 used Joker
  "avg_points": 5.33,       ← Average of [4, 4, 8]
  "is_consensus": true,
  "estimates": {
    "1": {"points": 4, "is_joker": false},
    "2": {"points": 4, "is_joker": false},
    "3": {"points": 8, "is_joker": false},
    "4": {"points": 0, "is_joker": true}   ← Joker vote
  }
}
```

## Consensus Rules

### ✅ Consensus Reached When:

1. **All participants voted** (including Joker votes count)
2. **Valid (non-Joker) estimates agree** (max - min ≤ 2 points)

### ❌ Consensus Failed When:

1. **Not everyone voted yet**
   ```
   Expected: 4 votes, Got: 3 → Wait for 1 more
   ```

2. **Valid estimates conflict** (max - min > 2)
   ```
   Votes: [2, 8, J]  → Valid: [2, 8]  → Diff: 6 > 2 → No agreement
   ```

3. **No valid estimates** (all Joker)
   ```
   Votes: [J, J, J]  → Can't estimate with no data
   ```

## Common Questions

**Q: Does Joker count as "present"?**

A: Yes! Joker means "I'm here and voted, just abstaining."

---

**Q: What if I accidentally clicked Joker?**

A: Click "Change Estimate" and pick a number. Easy!

---

**Q: Should we allow Jokers in our team?**

A: Pros:
- Honest abstention (better than guessing)
- Faster meetings (no "I don't know" delays)
- Inclusive for peripheral team members

Cons:
- Might hide expertise ("I could help but won't")
- Lazy voting option

Recommendation: **Allow it, but track usage. If >30% Joker rate, investigate.**

---

**Q: Do we push Joker votes to Jira?**

A: No, only the final consensus estimate goes to Jira. Joker votes are local only.

---

**Q: Can I see who voted Joker?**

A: Yes, check the estimate summary in the UI. It shows each person's vote with Joker indicator.

---

**Q: Is Joker the same as "Pass"?**

A: Similar but different:
- **Joker**: "I'm here, participate, but don't count my opinion"
- **Pass**: "I'm sitting out this estimate"

Use Joker for abstention, not absence.

## Team Guidelines

### Suggested Joker Policy

```markdown
## When It's OK to Vote Joker

✅ You lack context/expertise in this area
✅ You're not implementing this feature
✅ You need to defer to the expert
✅ You're in a tight time constraint
✅ You have a conflict of interest

## When to Give a Real Number

❌ You can estimate but choose not to
❌ You're just tired of voting
❌ You want to look impartial (give your best guess)
❌ You're avoiding conflict
```

### Track Joker Metrics

```
Weekly Report:
- Total estimates: 125
- Joker votes: 15 (12%)
- Consensus rate: 92%
- Average estimation speed: 3 min per issue
```

🎯 **Joker rate 12%** = Good (specific abstentions)
⚠️ **Joker rate 35%** = Investigate (too many abstentions)

## Troubleshooting

### Issue: Joker button not appearing

**Solution**: 
1. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Update frontend: `npm install && npm start`

### Issue: Joker vote not saving

**Solution**:
1. Check API endpoint: `POST /api/v1/estimates/` with `is_joker: true`
2. Verify token is valid
3. Check browser console for errors

### Issue: Joker not excluded from consensus

**Solution**:
1. Check database migration ran: `alembic history`
2. Verify `is_joker` column exists
3. Check backend logs: `docker-compose logs api | grep -i joker`

## Further Reading

- **Full Feature Docs**: See `JOKER_CARD_FEATURE.md`
- **Deployment Guide**: See `DEPLOYMENT_CHECKLIST.md`
- **API Reference**: Check Swagger at `/docs`

---

**You're all set! Start voting with Joker! 🃏**
