"use client";

import { QualityAuditFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function QualityAuditFrontendPage() {
  const runtime = useModuleRuntime("quality-audit");

  return (
    <ModulePageFrame
      title="Audit kvality"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <QualityAuditFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
