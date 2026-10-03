import { serverLabs } from "./server-labs";
import { dockerLabs } from "./docker";
import { ccnaLabs } from "./ccna";
import { ccnaPracticeUnits, ccnaLegacyPracticeUnits } from "./ccna-bank";

/** Reuse account-scoped lab checkpoints without mixing course question banks. */
export const learningLabs = [...serverLabs, ...dockerLabs, ...ccnaLabs, ...ccnaPracticeUnits, ...ccnaLegacyPracticeUnits];
