# Repository & Action Refactor Checklist (PostgreSQL Schema)

## 1. Repository Layer

- [ ] Create new Prisma-based repositories:
  - `prisma/userRepository.ts`
  - `prisma/inventoryRepository.ts`
  - `prisma/equipmentRepository.ts`
  - `prisma/mailRepository.ts`
  - `prisma/questRepository.ts`
  - `prisma/missionRepository.ts`
- [ ] Implement CRUD helpers with transactions:
  - `getUserWithProfile(userId)`
  - `updateUserCore(userId, data)`
  - `getInventory(userId)`, `addInventoryItem`, `updateInventoryItem`, `removeInventoryItem`
  - `setEquipmentSlot(userId, slot, inventoryId)`
  - `logInventoryHistory(userId, inventoryId, action, delta)`
- [ ] Replace existing `db.ts` functions (based on sqlite) gradually:
  - `db.getUser`, `db.updateUser`, `db.getAllUsers`, etc., should delegate to Prisma repositories.
  - Maintain compatibility layer during transition (feature flag or environment switch).

## 2. Service / Action Layer Updates

Identify all action handlers that mutate user data and refactor to use new repositories with transaction boundaries.

| Module / File | Key Functions | Notes |
|---------------|--------------|-------|
| `server/actions/rewardActions.ts` | `handleRewardAction`, `grantTournamentRewards` | Move to transaction: update inventory, update gold/diamonds, log history |
| `server/actions/singlePlayerActions.ts` | `START_SINGLE_PLAYER_GAME`, `CONFIRM_SINGLE_PLAYER_GAME_START`, etc. | Replace direct `db.updateUser` / JSON updates |
| `server/actions/blacksmithActions.ts` (if exists) | forging/disassembly/enhancement | Each operation should manipulate `user_inventory`, `inventory_history`, `user_equipment` |
| `server/actions/negotiationActions.ts` | AP deduction, reward distribution | Use `inventoryRepo`, `userRepo`, `mailRepo` |
| `server/actions/tournamentActions.ts` | `START_TOURNAMENT_SESSION`, `CLAIM_TOURNAMENT_REWARD` | Move inventory and user updates into transactions |
| `server/actions/marketplace/*.ts` | Trading, listing, buying | Ensure inventory transfer is atomic |
| `server/summaryService.ts` | `processGameSummary`, `endGame` | Produces rewards, XP, AP updates → use repositories |
| `server/utils/userUpdateHelper.ts` | selective broadcast | Update to gather diff from new schema |
| `server/gameActions.ts` | miscellaneous | Audit for any direct mutations |

Additional modules to review:
- `server/actions/mailActions.ts`
- `server/actions/inventoryActions.ts`
- `server/actions/profileActions.ts`
- `server/scheduledTasks.ts` (daily resets, AP regeneration)

## 3. Transaction Strategy

- Introduce helper `withTransaction(fn)` that wraps Prisma `$transaction`.
- All action handlers should:
  1. Load required data within transaction
  2. Apply mutations via repository helpers
  3. Commit and return updated snapshot for broadcast
- Prevent partial updates by ensuring data is not modified outside transactions.

## 4. Broadcasting & DTO Updates

- Adjust `userUpdateHelper` to extract data from new structure (inventory/equipment from separate queries).
- Consider caching or selective fetch to minimize DB round-trips.

## 5. Backward Compatibility Plan

- Temporary feature flag to toggle between SQLite path and Prisma/Postgres path (ENV-based).
- For the refactor period, support both (read from SQLite but write to Postgres) or freeze SQLite writes once Postgres path is ready.
- Ensure WebSocket payloads stay backward compatible for clients.

## 6. Testing Plan

- Unit tests for repository methods (using Prisma test client).
- Integration tests for each action handler to validate transaction boundaries and broadcast payloads.
- Regression checklist: equip/unequip, reward claim, blacksmith operations, marketplace trade, quest progress, mission timers, AP regen, tournament rewards.

## 7. Rollout Steps

1. Implement repositories + feature flag.
2. Incrementally migrate action handlers (starting from least complex, e.g., reward claims).
3. Enable Prisma path in staging, run full regression.
4. Switch production to Prisma/Postgres once migration complete.
5. Remove legacy SQLite code after stabilization.


