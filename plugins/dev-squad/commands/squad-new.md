---
description: Start the Plan stage for a new product — brainstorm intent.md, choose a gate mode, and scaffold .squad/
argument-hint: <product-name>
---

Product name: $ARGUMENTS

1. If `.squad/squad.config.json` already exists and its `stage` is not
   `done`, ask the human whether to archive the existing product to
   `.squad/archive/<old-product>-<date>/` before continuing. Never
   overwrite silently.
2. If the current directory is not a git repository (`git rev-parse
   --is-inside-work-tree` fails), tell the human and ask whether to run
   `git init` before continuing. Do not init silently.
3. Ask the human which gate mode to use: `full` (pause after every stage
   handoff) or `critical-only` (pause only before Build and before a
   production deploy). If they don't have a preference, recommend `full`
   for a first product with this squad, `critical-only` once they're
   comfortable with it.
4. Ask the human how many Devs may run in parallel during Build
   (`max_parallel_devs`) — an integer. If they have no preference, default
   to `4`.
5. Use the `superpowers:brainstorming` skill with the human to produce the
   intent — a clear problem statement, a target user, and a definition of
   "done." Once agreed, write it to `.squad/intent.md`.
6. Write `.squad/squad.config.json`:
   ```json
   {
     "product": "<product-name from $ARGUMENTS, kebab-case>",
     "stage": "plan",
     "gate_mode": "<full|critical-only>",
     "max_parallel_devs": <value>,
     "pending_gate": null
   }
   ```
7. Tell the human the intent is written and that `/squad-advance` moves it
   into Design. Follow the `dev-squad-protocol` skill for everything after
   this point.
