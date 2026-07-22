"use client";

import { PlanningFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function PlanningFrontendPage() {
  const runtime = useModuleRuntime("planning");

  return (
    <ModulePageFrame
      title="Plánovanie"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <PlanningFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
