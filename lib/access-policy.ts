export const FREE_PAGE_LIMIT = 3;
export const FREE_PROMPT_LIMIT = 3;
export const FREE_ATTACHMENT_LIMIT = 3;

export type AccessPolicyInput = {
  planId?: string | null;
  isAdmin?: boolean;
};

export type AccessPolicy = {
  planId: string;
  isAdmin: boolean;
  isFree: boolean;
  hasUnlimitedAccess: boolean;

  pageLimit: number | null;
  promptLimit: number | null;
  attachmentLimit: number | null;
};

export function getAccessPolicy({
  planId,
  isAdmin = false,
}: AccessPolicyInput): AccessPolicy {
  const normalizedPlan =
    String(planId || "free")
      .trim()
      .toLowerCase();

  /*
   * ADMIN má absolútnu prioritu.
   *
   * Admin nesmie spadnúť do Free iba preto,
   * že má v staršom DB zázname plan_id = free.
   */
  if (isAdmin) {
    return {
      planId: "admin",

      isAdmin: true,
      isFree: false,
      hasUnlimitedAccess: true,

      pageLimit: null,
      promptLimit: null,
      attachmentLimit: null,
    };
  }

  const isFree = normalizedPlan === "free";

  /*
   * Podľa požiadavky:
   *
   * FREE     = obmedzený
   * NON-FREE = neobmedzený
   */
  if (!isFree) {
    return {
      planId: normalizedPlan,

      isAdmin: false,
      isFree: false,
      hasUnlimitedAccess: true,

      pageLimit: null,
      promptLimit: null,
      attachmentLimit: null,
    };
  }

  return {
    planId: "free",

    isAdmin: false,
    isFree: true,
    hasUnlimitedAccess: false,

    pageLimit: FREE_PAGE_LIMIT,
    promptLimit: FREE_PROMPT_LIMIT,
    attachmentLimit: FREE_ATTACHMENT_LIMIT,
  };
}