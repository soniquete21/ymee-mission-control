-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "capabilities" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "skills" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'specialist',
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "needsAudit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routingReason" TEXT,
ADD COLUMN     "workflowState" TEXT NOT NULL DEFAULT 'unassigned';
