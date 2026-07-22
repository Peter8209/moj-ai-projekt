"use client";

import { HumanizerFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function HumanizerFrontendPage() {
  const runtime = useModuleRuntime("humanizer");

  return (
    <ModulePageFrame
      title="Humanizátor"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <HumanizerFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
