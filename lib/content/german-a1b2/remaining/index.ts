import type { RemainingModule } from "./helpers.ts";
import { genitivModule } from "./genitiv.ts";
import { verbenDativAkkusativModule } from "./verben-dativ-akkusativ.ts";
import { trennbareVerbenModule } from "./trennbare-verben.ts";
import { dassVsZuModule } from "./dass-vs-zu.ts";
import { umOhneStattModule } from "./um-ohne-statt.ts";
import { satzstellungModule } from "./satzstellung.ts";

export const remainingModules: RemainingModule[] = [
  genitivModule,
  verbenDativAkkusativModule,
  trennbareVerbenModule,
  dassVsZuModule,
  umOhneStattModule,
  satzstellungModule,
];

export const remainingPractice = Object.fromEntries(
  remainingModules.map((module) => [module.id, { writing: module.writing, dictation: module.dictation }]),
);
