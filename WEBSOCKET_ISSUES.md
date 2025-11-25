# WebSocket Implementation - Issues & Future Investigation

**Date:** January 21, 2025
**Status:** ❌ Removed - Too many issues
**Decision:** Reverted to simple synchronous compile with smart caching

---

## What We Tried

We attempted to implement WebSocket for real-time PDF generation progress updates to provide non-blocking UI during the 5-second PDF compilation process.

### Architecture

**Backend:**
- Created `services/websocket_manager.py` - Connection manager
- Created `migrations/add_pdf_caching_fields.py` - Database fields for caching
- Updated `services/pdf_cache_service.py` - Background PDF generation with WebSocket messages
- Added WebSocket endpoint `/api/projects/ws` with JWT authentication

**Frontend:**
- Created `hooks/useWebSocket.js` - WebSocket hook with auto-reconnect
- Updated `ProjectEditor.jsx` - Listen for WebSocket messages
- Updated `DocumentViewer.jsx` - Progress bar in header

### Expected Flow

1. User clicks "Compile"
2. Backend starts background task
3. WebSocket sends real-time updates: "Building DOCX...", "Converting to PDF...", "Finalizing..."
4. Frontend shows progress bar in header
5. User can continue editing while PDF generates
6. When complete, PDF auto-loads

---

## Issues Encountered

### Issue #1: Routing Conflicts
**Problem:** WebSocket endpoint registered in router (`@router.websocket("/ws")`) was not being called.
**Symptom:** Connection accepted at ASGI level but no logs from our handler.
**Attempted Fix:** Moved endpoint from `routers/projects.py` to `main.py`
**Result:** Partially fixed - endpoint started being called

### Issue #2: Double Accept Error
**Problem:** Called `websocket.accept()` twice (once in endpoint, once in manager).
**Error:** `RuntimeError: Expected ASGI message "websocket.send" or "websocket.close", but got 'websocket.accept'`
**Fix:** Removed accept() from manager, only accept in endpoint
**Result:** Fixed

### Issue #3: Token Authentication
**Problem:** Used wrong localStorage key - looked for `token` instead of `access_token`.
**Symptom:** Frontend hook never attempted connection.
**Fix:** Changed to `localStorage.getItem('access_token')`
**Result:** Fixed

### Issue #4: Infinite Reconnection Loop ❌ (BLOCKER)
**Problem:** WebSocket connects successfully, then immediately disconnects in infinite loop.
**Symptom:**
```
✅ WebSocket connected successfully!
🔌 WebSocket disconnected - Code: 1005
Reconnecting... (attempt 1/5)
```

**Backend logs:**
```
✓ Authenticated user 1
✓ Registered - Total: 1
Client disconnected (user 1)
✓ Cleanup (user 1)
[Repeats infinitely]
```

**Root Cause Hypothesis:**
The `useEffect` cleanup function in `useWebSocket.js` was running on every render because `connect` and `disconnect` functions were in the dependency array. This caused:
1. Component renders → connect() called
2. Connection opens successfully
3. State changes (`isConnected = true`)
4. Component re-renders
5. useEffect cleanup runs → disconnect() called
6. Connection closes
7. Reconnect logic triggers → back to step 1

**Attempted Fix:** Removed `connect` and `disconnect` from useEffect dependency array.
**Result:** ❌ Still had infinite loop (unclear why)

**Possible Other Causes:**
- React StrictMode causing double mounting/unmounting in development
- Hot Module Reload (HMR) causing component remounts
- Some other parent component re-rendering ProjectEditor
- WebSocket library issue in browser
- ASGI/Uvicorn issue with WebSocket handling

---

## What Works

✅ WebSocket connection establishes successfully
✅ Authentication works (JWT token validation)
✅ User lookup works
✅ Connection registered in manager
✅ Simple test endpoint (`/test-ws`) works perfectly

---

## What Doesn't Work

❌ Connection immediately disconnects after connecting
❌ Infinite reconnection loop
❌ Never stays connected long enough to receive messages
❌ Unclear root cause despite extensive debugging

---

## Current Solution

**Reverted to synchronous compile with smart caching:**

```javascript
const handleCompile = async () => {
  setCompiling(true);

  // Save changes
  await projectService.updateProject(projectId, { resume_json, section_order });

  // Compile (blocking, but with caching)
  const response = await api.post(`/api/projects/${projectId}/compile`);

  // Reload PDF
  await loadPdfPreview();
  setPendingChanges(false);
  setCompiling(false);

  toast.success(response.data.cached ? 'PDF loaded from cache!' : 'PDF compiled successfully!');
};
```

**Benefits:**
- ✅ Simple and reliable
- ✅ Smart caching makes repeated compiles instant
- ✅ First compile takes 5 seconds (acceptable)
- ✅ No complex WebSocket infrastructure
- ✅ No infinite loops or reconnection issues

---

## Files Created (Now Unused)

**Backend:**
- `backend/services/websocket_manager.py` - Can be deleted
- `backend/migrations/add_pdf_caching_fields.py` - **Keep** (used for caching)

**Frontend:**
- `frontend/src/hooks/useWebSocket.js` - Can be deleted

**Test Files:**
- `test-websocket.html` - Can be deleted

---

## Future Investigation

If we want to retry WebSocket in the future, investigate:

1. **Why does the connection close immediately?**
   - Add extensive logging to see what triggers `ws.onclose`
   - Check if it's a browser security issue
   - Test with a simpler component (not ProjectEditor)
   - Test without React StrictMode

2. **Alternative Approaches:**
   - **Server-Sent Events (SSE):** One-way updates from server (simpler than WebSocket)
   - **Polling with exponential backoff:** Simple but less efficient
   - **WebSocket with better reconnection logic:** Debounce reconnects, add backoff

3. **React-specific issues:**
   - Test WebSocket in a standalone component
   - Check if ProjectEditor has some lifecycle issue
   - Use `useRef` for WebSocket instead of state

4. **Production considerations:**
   - WebSocket with load balancers (sticky sessions required)
   - WebSocket with Redis Pub/Sub for horizontal scaling
   - Connection pooling and rate limiting

---

## Lessons Learned

1. **Simple is better:** WebSocket added complexity for minimal UX improvement
2. **Caching solved the real problem:** Most compiles are instant with caching
3. **5 seconds is acceptable:** Users don't compile that often
4. **Debugging WebSockets is hard:** Lifecycle issues are difficult to trace
5. **Know when to stop:** After multiple failed attempts, revert to working solution

---

## Cost Analysis

**WebSocket Approach:**
- API calls: 0 (perfect!)
- Complexity: Very high
- Reliability: Low (couldn't get it working)

**Simple Caching Approach:**
- API calls: 1 per compile (only when needed)
- Complexity: Very low
- Reliability: High (works perfectly)

**Winner:** Simple caching approach

---

## Recommendation

**Do NOT attempt WebSocket again unless:**
1. Users are compiling 100+ times per session
2. Compile time exceeds 30+ seconds
3. We hire a WebSocket expert
4. We have time for extensive debugging

For now, smart caching provides 95% of the benefit with 5% of the complexity.
