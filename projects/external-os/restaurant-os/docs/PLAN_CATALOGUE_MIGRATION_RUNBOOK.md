# Plan catalogue migration runbook

The plan-ID validator migrations stop deployment when a stored plan cannot be matched safely. Use the row IDs and plan values in the migration error to repair each row to an exact plan for its plugin. Do not infer a catalogue ID from a tier name. If no valid mapping is known, leave the row unchanged and escalate rather than guessing.

After repairing the listed rows, mark the failed migration rolled back from the corresponding project directory, then deploy again:

```sh
# Control plane
cd orbitox
pnpm exec prisma migrate resolve --rolled-back 20261105010000_orbitox_validate_plugin_plan_ids --schema prisma/schema.prisma
pnpm exec prisma migrate deploy --schema prisma/schema.prisma

# RestaurantOS
cd ../projects/external-os/restaurant-os
pnpm exec prisma migrate resolve --rolled-back 20261105010000_restaurant_validate_catalogue_plan_ids --schema prisma/schema.prisma
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

If a later foreign-key or plugin-match migration fails instead, resolve that specific failed migration name after repairing the reported rows, then deploy again.
