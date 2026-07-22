"use client";

import { DataAnalysisFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function DataAnalysisFrontendPage() {
  const runtime = useModuleRuntime("data-prepare");

  return (
    <ModulePageFrame
      title="Analýza dát"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <DataAnalysisFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
