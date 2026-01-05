# ✨ Automatic Consensus Refresh Feature

## Overview

This document describes the automatic page refresh feature that is triggered when a consensus is reached on issue estimates in a poker session.

## What Changed

### Frontend Changes (SessionDetail.jsx)

#### 1. New State Management
```javascript
const [consensusNotification, setConsensusNotification] = useState(null);
const [ws, setWs] = useState(null);
```

- `consensusNotification`: Stores consensus event data for UI notification
- `ws`: Stores WebSocket connection reference for proper cleanup

#### 2. Enhanced WebSocket Handler

The `setupWebSocket()` function now listens for two event types:

**estimate_update** - Fired when any estimate changes
```javascript
if (data.type === 'estimate_update') {
  console.log('Estimate updated:', data.data);
  loadSessionData();
}
```

**consensus_reached** - Fired when all estimators have voted and consensus is achieved
```javascript
else if (data.type === 'consensus_reached') {
  console.log('Consensus reached for issue:', data.issue_id);
  
  // Show notification
  setConsensusNotification({
    issueId: data.issue_id,
    issueKey: data.issue_key,
    finalEstimate: data.final_estimate,
    isJoker: data.is_joker,
  });
  
  // Auto-refresh data
  loadSessionData();
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    setConsensusNotification(null);
  }, 5000);
}
```

#### 3. Consensus Notification Alert

A new `Alert` component displays at the top of the page:

```javascript
{consensusNotification && (
  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setConsensusNotification(null)}>
    ✨ <strong>Консенсус достигнут!</strong> Задача {issueKey} оценена в 
    <strong>{finalEstimate} story points</strong>. Страница обновлена автоматически.
  </Alert>
)}
```

Features:
- Shows which issue reached consensus
- Displays final estimate (story points or "Abstain" for joker)
- Auto-dismisses after 5 seconds
- User can manually close it

#### 4. Proper WebSocket Cleanup

```javascript
return () => {
  if (ws) {
    ws.close();
  }
};
```

WebSocket connection is properly closed when component unmounts to prevent memory leaks.

## User Experience Flow

1. **User opens poker session** 
   - WebSocket connection established
   - Listening for real-time events

2. **All estimators submit their votes**
   - Estimates appear in real-time
   - Backend calculates consensus

3. **Consensus reached**
   - Backend sends `consensus_reached` WebSocket event
   - Page automatically refreshes with new estimate
   - Success notification appears at top of page
   - Notification auto-hides after 5 seconds

4. **User sees final estimate**
   - Issue card shows "🎯 Final Estimate: X story points"
   - Ready to move to next issue

## Backend Requirements

For this feature to work, the backend WebSocket handler must send `consensus_reached` events:

```json
{
  "type": "consensus_reached",
  "issue_id": 123,
  "issue_key": "DEVOPS-456",
  "final_estimate": 8,
  "is_joker": false
}
```

Or for joker/abstain estimates:

```json
{
  "type": "consensus_reached",
  "issue_id": 123,
  "issue_key": "DEVOPS-456",
  "final_estimate": 0,
  "is_joker": true
}
```

## Testing

### Manual Testing

1. Create a poker session with 2-3 estimators
2. Add an issue for estimation
3. Have all estimators submit their votes
4. Observe:
   - Page automatically refreshes
   - Green success notification appears
   - Notification disappears after 5 seconds
   - Issue card shows final estimate

### Console Logging

The feature includes console.log statements for debugging:

```javascript
console.log('Consensus reached for issue:', data.issue_id, 'Final estimate:', data.final_estimate);
```

Open browser DevTools Console to see real-time events.

## Benefits

✅ **No Manual Refresh** - Users don't need to refresh the page
✅ **Real-time Feedback** - Immediate notification when consensus reached
✅ **Better UX** - Seamless experience without page reloads
✅ **Visual Confirmation** - Green alert confirms the update
✅ **Auto-dismiss** - Notification automatically disappears after 5 seconds
✅ **Clean Code** - Proper WebSocket lifecycle management

## Browser Compatibility

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Modern browsers with WebSocket support

## Notes

- WebSocket connection required for this feature
- Fallback: If WebSocket unavailable, users can manually refresh
- Notification auto-hides regardless of user interaction
- Multiple issues reaching consensus will show separate notifications
