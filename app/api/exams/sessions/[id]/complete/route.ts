// Keep the explicit completion endpoint from the public API contract while
// sharing the idempotent completion handler with POST /sessions/:id.
export { POST } from "../route";
