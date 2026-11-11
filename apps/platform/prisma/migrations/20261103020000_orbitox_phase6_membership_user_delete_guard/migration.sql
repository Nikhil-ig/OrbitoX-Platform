ALTER TABLE "CustomerMembership"
  DROP CONSTRAINT "CustomerMembership_userId_fkey";

ALTER TABLE "CustomerMembership"
  ADD CONSTRAINT "CustomerMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "CustomerUser"("id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
