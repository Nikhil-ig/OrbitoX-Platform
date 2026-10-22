# 🧪 RestaurantOS 2.x — End-to-End Acceptance Matrix

**Date:** 2026-10-09  
**Acceptance Standard:** Human Action $\rightarrow$ UI Command $\rightarrow$ Runtime API $\rightarrow$ Persistent DB $\rightarrow$ Event Outbox $\rightarrow$ SSE Broadcast $\rightarrow$ Cross-Screen Verification $\rightarrow$ Page Refresh Persistence.  

---

## 26-Step Continuous Vertical Slice Verification Matrix

| Step | Acceptance Flow | UI Trigger | Runtime API Contract | DB Model Mutated | Domain Event Emitted | Cross-Screen Impact | Refresh Invariant |
|---|---|---|---|---|---|---|---|
| **01** | Create Branch | Locations `+ Add Branch` | `POST /api/restaurant/branches` | `BranchRecord` | `branch.created` | Header dropdown displays new branch | Preserved on reload |
| **02** | Switch Branch | Shell dropdown | `Context Switch` | `Context` | `context.switched` | Floors, tables, & KDS swap to new branch | Preserved via URL & state |
| **03** | Create Floor | Floors `+ New Service Area` | `POST /api/restaurant/floors` | `FloorRecord` | `floor.created` | Left rail in Floor Studio adds section | Preserved on reload |
| **04** | Switch Floor | Floor Studio left rail | `Context Switch` | `Context` | `floor.selected` | Canvas replaces table collection | Preserved on reload |
| **05** | Create Table | Floor Studio `+ Add Table` | `POST /api/restaurant/floor/save` | `TableFloorRecord` | `table.created` | New table node appears on canvas | Node exists on reload |
| **06** | Drag Table | Floor Canvas pointer drag | `POST /api/restaurant/floor/save` | `TableFloorRecord.x/y` | `table.updated` | Canvas renders at new coords | X/Y preserved on reload |
| **07** | Resize Table | Inspector width/height | `POST /api/restaurant/floor/save` | `TableFloorRecord.w/h` | `table.updated` | Canvas reflects new bounding box | Dimensions preserved |
| **08** | Edit Capacity | Inspector capacity input | `PATCH /api/restaurant/tables/:id` | `TableFloorRecord.capacity` | `table.updated` | Seat count & radial ring sync to new cap | Capacity preserved |
| **09** | Add / Remove Seat | Inspector `+ Add Seat` | `POST /api/restaurant/tables/:id/seats`| `SeatRecord` | `seat.updated` | Radial seat ring adds/removes node | Seat ring matches on reload |
| **10** | Assign Guest | Inspector `Seat Guest` | `POST /api/restaurant/seats/:id/guest` | `GuestRecord`, `SeatRecord` | `guest.joined` | Seat turns copper; Guests page lists guest | Guest persists on reload |
| **11** | Move Guest | Inspector `Transfer Seat` | `POST /api/restaurant/seats/:id/guest` | `SeatRecord` | `guest.moved` | Guest moves to target seat | Seat assignment holds |
| **12** | Merge Tables | Inspector `Merge Table` | `POST /api/restaurant/tables/merge` | `TableFloorRecord.merged`| `table.merged` | Connected dashed line links tables | Merged state holds |
| **13** | Unmerge Tables | Inspector `Unmerge Table` | `POST /api/restaurant/tables/unmerge` | `TableFloorRecord.merged`| `table.unmerged` | Tables unlink cleanly | Unmerged state holds |
| **14** | Diner Scans & Joins | Diner PWA onboarding | `POST /api/restaurant/sessions/join` | `DiningSession`, `Guest` | `guest.joined` | Floor shows active session | Ephemeral capability active |
| **15** | Diner Orders | Diner PWA `Submit Order` | `POST /api/restaurant/orders` | `RestaurantOrder`, `Task` | `order.created` | KDS shows ticket; Ops revenue increases | Order listed in Orders |
| **16** | KDS Receives Ticket| KDS screen | `GET /api/restaurant/kds` / SSE | `KitchenTask` | `task.created` | Ticket displays in correct station column| Ticket visible on KDS reload |
| **17** | Cook Starts Dish | KDS `[ START ]` | `POST /api/restaurant/kds/bump` | `KitchenTask.status` | `task.started` | Diner progress shows "Cooking" | Status is IN_PROGRESS |
| **18** | Diner Sees Cooking | Diner PWA live course | SSE subscription | `CustomerProjection` | `task.started` | Timeline advances to simmering / oven | Live course shown |
| **19** | Cook Marks Ready | KDS `[ READY ]` | `POST /api/restaurant/kds/bump` | `KitchenTask.status` | `task.ready` | Item appears on Expo Pass | Status is READY |
| **20** | Expo Dispatches | Expo `[ SEND TO TABLE ]` | `POST /api/restaurant/kds/bump` | `KitchenTask.status` | `task.bumped` | Table marked SERVED on floor | Status is BUMPED |
| **21** | Guest Asks Water | Diner "Need something?" | `POST /api/restaurant/service-requests`| `ServiceRequest` | `service_request.created`| Attention Queue in Ops shows water alert| Request in queue on reload |
| **22** | Staff Resolves Req | Ops `[ Resolve ]` | `POST /api/restaurant/service-requests/:id/resolve`| `ServiceRequest.status` | `service_request.resolved`| Request clears from queue | Request marked RESOLVED |
| **23** | Diner Sees Feedback| Diner PWA drawer | SSE subscription | `ServiceRequest` | `service_request.resolved`| Drawer shows "Water Delivered ✓" | Banner visible |
| **24** | Diner Requests Bill| Diner PWA `Request Bill` | `POST /api/restaurant/service-requests`| `ServiceRequest` | `bill.requested` | Ops & Floor show amber Bill Requested | Status is BILL_REQUESTED |
| **25** | Table Closes | Ops `Close Session` | `POST /api/restaurant/sessions/close` | `DiningSession`, `Table` | `session.closed` | Table becomes AVAILABLE | Table green on reload |
| **26** | Zero-Trust Rejection| Old diner refresh | `GET /api/restaurant/qr/:locator` | `DiningSession` | `session.expired` | Old session capability rejected | Clean new session prompt |
