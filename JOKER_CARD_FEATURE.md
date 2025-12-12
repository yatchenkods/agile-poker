# Joker Card Feature (J) 🃏

## Overview

Joker card (J) is a special voting option that allows team members to abstain from providing an estimate while still being marked as having participated in the vote.

## Features

### User Experience
- **Visual Indicator**: Joker cards are displayed as "J" button with gold styling
- **Clear Feedback**: When voted, shows "J" with "Joker (abstain)" label
- **Info Tooltip**: Hover info explains the purpose of the Joker card
- **Vote Status**: Participant is marked as voted even when using Joker

### Consensus Logic

Joker votes are **excluded** from consensus calculation:

#### Requirements for Consensus
1. **All participants must vote** (including Joker votes count as votes)
2. **Valid (non-Joker) estimates must reach agreement** (max - min ≤ 2 story points)

#### Examples

```
✅ CONSENSUS
- Votes: [4, 4, 8, J]        → Valid: [4, 4, 8] → Avg: 5.33 → Final: 4 or 8 points
- Votes: [4, 4, 4, J, J]      → Valid: [4, 4, 4] → Avg: 4 → Final: 4 points
- Votes: [8, 8, J]            → Valid: [8, 8] → Avg: 8 → Final: 8 points

❌ NO CONSENSUS
- Votes: [2, 8, J]            → Valid: [2, 8] → Diff: 6 > 2 → Wait for more info
- Votes: [1, 16, J, J]        → Valid: [1, 16] → Diff: 15 > 2 → Major disagreement
- Votes: [4, J]               → Only 1 valid vote → Need more opinions

⏳ INCOMPLETE
- Votes: [4, 8]               → Only 2 of 4 participants → Need J or actual votes
```

## Technical Implementation

### Database Schema

```sql
ALTER TABLE estimates ADD COLUMN is_joker BOOLEAN DEFAULT FALSE;
```

### Model Update

**File**: `app/models/estimate.py`

```python
class Estimate(Base):
    # ...
    is_joker = Column(Boolean, default=False, nullable=False)
```

### API Changes

#### Create/Update Estimate

**POST** `/api/v1/estimates/`

```json
{
  "session_id": 1,
  "issue_id": 1,
  "story_points": 8,
  "user_id": 1,
  "is_joker": false
}
```

Or with Joker:

```json
{
  "session_id": 1,
  "issue_id": 1,
  "story_points": 0,
  "user_id": 1,
  "is_joker": true
}
```

#### Estimate Summary

**GET** `/api/v1/estimates/summary/{issue_id}`

```json
{
  "issue_id": 1,
  "total_estimates": 4,
  "valid_estimates": 3,
  "avg_points": 5.33,
  "min_points": 4,
  "max_points": 8,
  "is_consensus": false,
  "joker_count": 1,
  "estimates": {
    "1": {"points": 4, "is_joker": false},
    "2": {"points": 4, "is_joker": false},
    "3": {"points": 8, "is_joker": false},
    "4": {"points": 0, "is_joker": true}
  }
}
```

### Frontend Changes

**File**: `frontend/src/components/EstimationCard.jsx`

- Added Joker button ("J") next to number buttons (1, 2, 4, 8, 16)
- Joker button has gold styling when selected
- State management for `isJoker` flag
- Info text explaining Joker behavior
- Display logic shows "J" instead of number when Joker is voted

### Backend Service Logic

**File**: `app/services/estimation_service.py`

#### Consensus Calculation

```python
# Separate joker and regular estimates
joker_estimates = [e for e in estimates if e.is_joker]
valid_estimates = [e for e in estimates if not e.is_joker]

# Check consensus only on valid estimates
if valid_estimates:
    points = [e.story_points for e in valid_estimates]
    is_consensus = (max(points) - min(points)) <= 2
```

## Deployment Steps

### 1. Run Database Migration

```bash
# Docker
docker-compose exec api alembic upgrade head

# Locally
alembic upgrade head
```

### 2. Update Backend

The updated code automatically handles Joker cards in consensus calculation.

### 3. Update Frontend

No manual steps - React components auto-load with new Joker button.

## Testing

### Manual Testing

1. **Create a session** with 4 participants
2. **Create an issue** to estimate
3. **Vote normally**: 
   - User 1: 4 points
   - User 2: 4 points
   - User 3: 8 points
   - User 4: **J (Joker)**
4. **Verify**: Issue should show consensus with ~5 points (excludes Joker)
5. **Test edge case**: All Joker votes → No consensus

### API Testing

```bash
# Submit Joker vote
curl -X POST http://localhost:8000/api/v1/estimates/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "session_id": 1,
    "issue_id": 1,
    "story_points": 0,
    "user_id": 1,
    "is_joker": true
  }'

# Get estimate summary
curl http://localhost:8000/api/v1/estimates/summary/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Use Cases

### When to Use Joker

1. **Lack of Information** - "I don't have enough context to estimate"
2. **System/Component Expertise** - "I shouldn't estimate this team's work"
3. **Conflict of Interest** - "I have a personal interest in the outcome"
4. **Technical Uncertainty** - "We need architectural discussion first"
5. **Time Constraints** - "I need to leave and can't fully discuss"

### When NOT to Use Joker

- You can make a reasonable estimate
- You want your opinion considered
- You're just being lazy

## Backward Compatibility

✅ **Fully backward compatible**

- Existing estimates: `is_joker` defaults to `false`
- Old API calls work without `is_joker` field
- Existing sessions unaffected

## Monitoring

### Key Metrics

- **Joker vote rate** - % of votes that are Joker
- **Consensus with Joker** - Issues reaching consensus when Jokers present
- **Joker patterns** - Which users/issues use Joker most

### Logging

Consensus calculation logs include Joker info:

```
[ESTIMATE] Issue #123: Valid votes: 3, Jokers: 1, Consensus: YES (4 points)
```

## FAQ

### Q: Does Joker count as a vote?
**A:** Yes, participant is marked as voted. Only excluded from estimate calculation.

### Q: What if everyone votes Joker?
**A:** No valid estimates → no consensus → issue stays unestimated.

### Q: Can I change Joker to a number later?
**A:** Yes, use "Change Estimate" button to switch between numbers and Joker.

### Q: Does Joker affect Jira integration?
**A:** No, only final consensus estimates are pushed to Jira.

## Future Enhancements

- [ ] Jira custom field for tracking Joker votes
- [ ] Admin dashboard showing Joker vote trends
- [ ] Optional "mandatory reason" when using Joker
- [ ] Team preferences for Joker strictness

---

**Ready to abstractly vote! 🃏**
