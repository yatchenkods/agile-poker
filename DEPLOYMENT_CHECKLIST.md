# Joker Card Feature - Deployment Checklist 🚀

## Pre-Deployment

### Code Review
- [ ] Review PR #4 for Joker card feature
- [ ] Check all file changes
- [ ] Verify no conflicts with ongoing work
- [ ] Approve migrations and schema changes

### Testing
- [ ] Run unit tests (backend)
  ```bash
  docker-compose exec api pytest
  ```
- [ ] Run frontend tests
  ```bash
  cd frontend && npm test
  ```
- [ ] Manual testing in dev environment
  ```bash
  docker-compose up -d
  docker-compose exec api alembic upgrade head
  # Test at http://localhost:3000
  ```

### Backup
- [ ] Backup production database
  ```bash
  docker exec agile-poker-postgres pg_dump -U poker agile_poker > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup integrity

## Deployment Steps

### 1. Prepare Release Branch

```bash
# Merge PR to main
git checkout main
git pull origin main

# Verify merge
git log --oneline -5
```

### 2. Backend Update

#### Option A: Docker (Recommended)

```bash
# Pull latest code
git pull origin main

# Rebuild backend image
docker-compose down
docker-compose build --no-cache api

# Start containers
docker-compose up -d

# Wait for database startup
sleep 5

# Run migrations
docker-compose exec api alembic upgrade head

# Verify health
docker-compose exec api curl http://localhost:8000/docs
```

#### Option B: Local Python

```bash
# Activate venv
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Restart API server
# (kill existing process and restart)
python -m uvicorn app.main:app --reload
```

### 3. Frontend Update

#### Option A: Docker

```bash
# Image auto-rebuilt in docker-compose build
# Restart frontend container
docker-compose restart frontend

# Verify at http://localhost:3000
```

#### Option B: Local npm

```bash
cd frontend
npm install  # Just in case
npm start
# Verify at http://localhost:3000
```

### 4. Database Verification

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U poker agile_poker

# Verify new column exists
\d estimates

# Should see:
# Column    | Type | Collation | Nullable | Default
# ----------+------+-----------+----------+---------
# is_joker  | boolean | | f | false

# Exit
\q
```

### 5. Health Checks

#### Backend Health

```bash
# Check API health
curl http://localhost:8000/docs

# Expected: Swagger UI loads successfully

# Check specific endpoints
curl http://localhost:8000/api/v1/sessions/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Frontend Health

```bash
# Check frontend loads
curl http://localhost:3000

# Should return HTML page

# Open in browser and verify:
# - No console errors
# - Joker button appears ("J" next to number buttons)
# - Can submit Joker vote
```

#### Database Health

```bash
# Check estimates table structure
docker-compose exec postgres psql -U poker agile_poker -c "\
  SELECT column_name, data_type, is_nullable \
  FROM information_schema.columns \
  WHERE table_name = 'estimates' \
  ORDER BY ordinal_position;"

# Verify is_joker column exists with type boolean
```

## Post-Deployment Verification

### Functional Testing

- [ ] Create new session
- [ ] Add participants
- [ ] Create issue to estimate
- [ ] **User 1**: Vote 4 points
- [ ] **User 2**: Vote 4 points  
- [ ] **User 3**: Vote 8 points
- [ ] **User 4**: Vote **Joker (J)**
- [ ] Verify:
  - [ ] All 4 users marked as voted
  - [ ] Summary shows `valid_estimates: 3, joker_count: 1`
  - [ ] Consensus calculated from [4, 4, 8] only
  - [ ] Final estimate shows correct value

### API Testing

```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d 'username=admin@example.com&password=admin' \
  -H "Content-Type: application/x-www-form-urlencoded" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Submit Joker estimate
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

# Expected: 200 OK with estimate details
```

### Monitoring

- [ ] Check application logs for errors
  ```bash
  docker-compose logs api | grep -i error
  docker-compose logs frontend | grep -i error
  ```
- [ ] Monitor database connections
  ```bash
  docker-compose exec postgres psql -U poker agile_poker -c \
    "SELECT count(*) FROM pg_stat_activity WHERE datname = 'agile_poker';"
  ```
- [ ] Watch for performance issues
  - Page load time < 2s
  - API response time < 500ms

## Rollback Plan

If critical issues occur:

### Option 1: Rollback Database Only

```bash
# Connect to DB
docker-compose exec api alembic downgrade -1

# This removes is_joker column but keeps code
# Code will handle missing column gracefully (defaults to false)
```

### Option 2: Full Rollback

```bash
# Restore from backup
cat backup_YYYYMMDD_HHMMSS.sql | \
  docker exec -i agile-poker-postgres psql -U poker agile_poker

# Revert code to previous version
git checkout main~1

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Communication

- [ ] Notify team about deployment
- [ ] Post deployment notes in #dev-ops channel
- [ ] Link to feature documentation: `JOKER_CARD_FEATURE.md`
- [ ] Encourage team to test new Joker feature

## Success Criteria

✅ Deployment is **successful** when:

1. **No Database Errors**
   - Migrations completed without errors
   - `is_joker` column exists and readable

2. **API Functional**
   - `/docs` loads Swagger UI
   - Can create estimates with `is_joker: true`
   - Summary includes `joker_count` field

3. **Frontend Functional**
   - "J" button visible in estimation UI
   - Joker votes save correctly
   - Display shows "J" for Joker votes

4. **Consensus Logic Working**
   - Joker votes excluded from calculation
   - Valid estimates determine consensus
   - All-Joker votes = no consensus

5. **No Regressions**
   - Existing features work
   - Regular voting still works
   - WebSocket updates function

## Post-Deployment

- [ ] Monitor for 24-48 hours
- [ ] Collect feedback from team
- [ ] Create follow-up issues if needed
- [ ] Update roadmap with completion
- [ ] Celebrate! 🎆

## Key Contacts

- **DevOps Lead**: [Your Name]
- **Backend Owner**: [Backend Lead]
- **Frontend Owner**: [Frontend Lead]
- **QA Lead**: [QA Lead]

## Document Version

- **Version**: 1.0
- **Date**: 2025-12-12
- **Feature PR**: #4
- **Branch**: `feature/joker-card`

---

**Deployment completed successfully! 🚀**
