"use client";

import { AiSupervisorFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function AiSupervisorFrontendPage() {
  const runtime = useModuleRuntime("ai-supervisor");

  return (
    <ModulePageFrame
      title="AI školiteľ"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <AiSupervisorFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
