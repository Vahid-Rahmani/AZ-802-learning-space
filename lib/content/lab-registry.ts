import { serverLabs } from "./server-labs";
import { dockerLabs } from "./docker";

/** Reuse account-scoped lab checkpoints without mixing course question banks. */
export const learningLabs = [...serverLabs, ...dockerLabs];
