"use client";

import { TranslationFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function TranslationFrontendPage() {
  const runtime = useModuleRuntime("translation");

  return (
    <ModulePageFrame
      title="Preklad"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <TranslationFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
