ALTER TABLE "Tenant"
    ADD CONSTRAINT "Tenant_planId_catalogue_format_check"
    CHECK ("planId" ~ '^restaurant-[a-z0-9-]+$');
