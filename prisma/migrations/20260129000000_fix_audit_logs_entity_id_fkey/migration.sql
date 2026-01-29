-- DropForeignKey: Remove the errant foreign key constraint on entity_id
-- The entity_id column in audit_logs is polymorphic and can reference
-- different entity types (users, switches, recipients, etc.) so it should
-- not have a foreign key constraint.
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_entity_id_fkey";
