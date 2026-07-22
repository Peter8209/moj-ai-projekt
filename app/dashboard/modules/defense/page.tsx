"use client";

import { DefenseFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function DefenseFrontendPage() {
  const runtime = useModuleRuntime("defense");

  return (
    <ModulePageFrame
      title="Obhajoba"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <DefenseFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
