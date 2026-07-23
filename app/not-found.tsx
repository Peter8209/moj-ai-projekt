import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import { createZedperaError } from "@/lib/api-error-messages";

export default function NotFound() {
  const descriptor = createZedperaError(
    "NOT_FOUND",
    {},
    {
      language: "sk",
    },
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050711] p-5 text-white">
      <div className="w-full max-w-2xl">
        <ZedperaErrorAlert error={descriptor} />
      </div>
    </main>
  );
}
