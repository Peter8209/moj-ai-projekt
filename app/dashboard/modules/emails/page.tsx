"use client";

import { EmailsFrontend } from "@/components/dashboard/modules";

import ModulePageFrame from "../_shared/ModulePageFrame";
import { useModuleRuntime } from "../_shared/useModuleRuntime";

export default function EmailsFrontendPage() {
  const runtime = useModuleRuntime("emails");

  return (
    <ModulePageFrame
      title="Emaily"
      loading={runtime.loading}
      warning={runtime.warning}
      onRefresh={runtime.refresh}
    >
      <EmailsFrontend {...runtime.frontendProps} />
    </ModulePageFrame>
  );
}
