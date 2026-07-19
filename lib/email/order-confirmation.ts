import "server-only";

import Stripe from "stripe";

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from "@/lib/billing/catalog";

type PaidPlanId = Exclude<PlanId, "free" | "admin">;

type CatalogEntry = Record<string, unknown>;

type OrderLine = {
  name: string;
  quantity: number;
  amountCents: number | null;
  currency: string;
};

type ResendSuccessResponse = {
  id?: string;
};

type ResendErrorResponse = {
  name?: string;
  message?: string;
  statusCode?: number;
};

export type SendOrderConfirmationEmailInput = {
  session: Stripe.Checkout.Session;
  planId: PaidPlanId | null;
  addonIds: AddonId[];
  paymentReference: string;
  locale?: string | null;
};

export type SendOrderConfirmationEmailResult = {
  sent: boolean;
  skipped: boolean;
  emailId: string | null;
  reason: string | null;
};

const EMAIL_SUBJECT = "Tvoja objednávka je potvrdená – vitaj v Zedpere";

const DEFAULT_LOCALE = "sk-SK";
const DEFAULT_CURRENCY = "eur";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 20_000;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Chýba premenná prostredia ${name}.`);
  }

  return value;
}

function getAppUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!appUrl) {
    throw new Error("Chýba NEXT_PUBLIC_APP_URL alebo NEXT_PUBLIC_BASE_URL.");
  }

  return appUrl.replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLocale(value: string | null | undefined): string {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  const localeMap: Record<string, string> = {
    sk: "sk-SK",
    "sk-sk": "sk-SK",
    cs: "cs-CZ",
    cz: "cs-CZ",
    "cs-cz": "cs-CZ",
    en: "en-GB",
    "en-gb": "en-GB",
    "en-us": "en-US",
    de: "de-DE",
    "de-de": "de-DE",
    pl: "pl-PL",
    "pl-pl": "pl-PL",
    hu: "hu-HU",
    "hu-hu": "hu-HU",
  };

  return localeMap[normalized] || DEFAULT_LOCALE;
}

function normalizeCurrency(value: string | null | undefined): string {
  const normalized = String(value || DEFAULT_CURRENCY)
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(normalized) ? normalized : "EUR";
}

function formatMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string | null {
  if (
    amountCents === null ||
    amountCents === undefined ||
    !Number.isFinite(amountCents)
  ) {
    return null;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(amountCents / 100);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getExpandedCustomer(
  session: Stripe.Checkout.Session,
): Stripe.Customer | null {
  if (!session.customer || typeof session.customer === "string") {
    return null;
  }

  if ("deleted" in session.customer && session.customer.deleted) {
    return null;
  }

  return session.customer as Stripe.Customer;
}

function getCustomerEmail(session: Stripe.Checkout.Session): string {
  const expandedCustomer = getExpandedCustomer(session);

  const candidates = [
    session.customer_details?.email,
    session.customer_email,
    expandedCustomer?.email,
    session.metadata?.customer_email,
    session.metadata?.email,
  ];

  for (const candidate of candidates) {
    const email = String(candidate || "")
      .trim()
      .toLowerCase();

    if (email && isValidEmail(email)) {
      return email;
    }
  }

  return "";
}

function getCustomerName(session: Stripe.Checkout.Session): string {
  const expandedCustomer = getExpandedCustomer(session);

  const candidates = [
    session.customer_details?.name,
    expandedCustomer?.name,
    session.metadata?.customer_name,
    session.metadata?.name,
  ];

  for (const candidate of candidates) {
    const name = String(candidate || "").trim();

    if (name) {
      return name;
    }
  }

  return "";
}

function readCatalogLabel(
  entry: CatalogEntry | undefined,
  fallback: string,
): string {
  if (!entry) {
    return fallback;
  }

  const candidates = [entry.name, entry.title, entry.label];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

function getPlanLabel(planId: PaidPlanId | null): string | null {
  if (!planId) {
    return null;
  }

  return readCatalogLabel(PLANS[planId] as unknown as CatalogEntry, planId);
}

function getAddonLabel(addonId: AddonId): string {
  return readCatalogLabel(ADDONS[addonId] as unknown as CatalogEntry, addonId);
}

function getProductName(
  product:
    | string
    | Stripe.Product
    | {
        deleted: true;
        id?: string;
      }
    | null,
): string {
  if (!product || typeof product === "string") {
    return "";
  }

  if ("deleted" in product && product.deleted) {
    return "";
  }

  return String((product as Stripe.Product).name || "").trim();
}

function getOrderLines(
  session: Stripe.Checkout.Session,
  planId: PaidPlanId | null,
  addonIds: AddonId[],
): OrderLine[] {
  const lineItems = session.line_items?.data || [];

  const stripeLines = lineItems
    .map<OrderLine | null>((lineItem) => {
      const productName = getProductName(lineItem.price?.product || null);
      const description = String(lineItem.description || "").trim();
      const name = productName || description;

      if (!name) {
        return null;
      }

      return {
        name,
        quantity: Math.max(Number(lineItem.quantity || 1), 1),
        amountCents:
          typeof lineItem.amount_total === "number"
            ? lineItem.amount_total
            : null,
        currency:
          String(lineItem.currency || session.currency || DEFAULT_CURRENCY)
            .trim()
            .toLowerCase() || DEFAULT_CURRENCY,
      };
    })
    .filter((line): line is OrderLine => Boolean(line));

  if (stripeLines.length > 0) {
    return stripeLines;
  }

  const fallbackLines: OrderLine[] = [];
  const planLabel = getPlanLabel(planId);

  if (planLabel) {
    fallbackLines.push({
      name: planLabel,
      quantity: 1,
      amountCents: null,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  for (const addonId of addonIds) {
    fallbackLines.push({
      name: getAddonLabel(addonId),
      quantity: 1,
      amountCents: null,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  if (fallbackLines.length === 0) {
    fallbackLines.push({
      name: "Objednávka ZEDPERA",
      quantity: 1,
      amountCents: session.amount_total,
      currency: session.currency || DEFAULT_CURRENCY,
    });
  }

  return fallbackLines;
}

function createOrderSummaryText({
  lines,
  paymentReference,
  session,
  locale,
}: {
  lines: OrderLine[];
  paymentReference: string;
  session: Stripe.Checkout.Session;
  locale: string;
}): string {
  const rows = lines.map((line) => {
    const amount = formatMoney(line.amountCents, line.currency, locale);

    return `- ${line.name}${line.quantity > 1 ? ` × ${line.quantity}` : ""}${
      amount ? `: ${amount}` : ""
    }`;
  });

  const total = formatMoney(session.amount_total, session.currency, locale);

  return [
    "ÚDAJE O OBJEDNÁVKE",
    `Číslo objednávky: ${paymentReference}`,
    ...rows,
    total ? `Uhradená suma: ${total}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function createOrderSummaryHtml({
  lines,
  paymentReference,
  session,
  locale,
}: {
  lines: OrderLine[];
  paymentReference: string;
  session: Stripe.Checkout.Session;
  locale: string;
}): string {
  const rows = lines
    .map((line) => {
      const amount = formatMoney(line.amountCents, line.currency, locale);

      return `
        <tr>
          <td
            style="
              padding:10px 0;
              border-bottom:1px solid #e5e7eb;
              color:#111827;
              font-size:15px;
              line-height:1.5;
            "
          >
            ${escapeHtml(line.name)}
            ${line.quantity > 1 ? ` × ${line.quantity}` : ""}
          </td>
          <td
            align="right"
            style="
              padding:10px 0 10px 16px;
              border-bottom:1px solid #e5e7eb;
              color:#111827;
              font-size:15px;
              line-height:1.5;
              white-space:nowrap;
            "
          >
            ${amount ? escapeHtml(amount) : "—"}
          </td>
        </tr>
      `;
    })
    .join("");

  const total = formatMoney(session.amount_total, session.currency, locale);

  return `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width:100%;
        margin:0 0 30px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:14px;
      "
    >
      <tr>
        <td style="padding:22px 24px;">
          <div
            style="
              margin:0 0 12px;
              color:#111827;
              font-size:18px;
              font-weight:700;
            "
          >
            Údaje o objednávke
          </div>

          <div
            style="
              margin:0 0 12px;
              color:#64748b;
              font-size:13px;
              line-height:1.5;
            "
          >
            Číslo objednávky:
            <strong style="color:#334155;">
              ${escapeHtml(paymentReference)}
            </strong>
          </div>

          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
          >
            ${rows}

            ${
              total
                ? `
                  <tr>
                    <td
                      style="
                        padding:14px 0 0;
                        color:#111827;
                        font-size:16px;
                        font-weight:700;
                      "
                    >
                      Uhradená suma
                    </td>
                    <td
                      align="right"
                      style="
                        padding:14px 0 0 16px;
                        color:#111827;
                        font-size:17px;
                        font-weight:700;
                        white-space:nowrap;
                      "
                    >
                      ${escapeHtml(total)}
                    </td>
                  </tr>
                `
                : ""
            }
          </table>
        </td>
      </tr>
    </table>
  `;
}

function createPlainTextEmail({
  customerName,
  loginUrl,
  orderSummary,
}: {
  customerName: string;
  loginUrl: string;
  orderSummary: string;
}): string {
  const greeting = customerName ? `Čau ${customerName},` : "Čau,";

  return `
Tvoja objednávka je potvrdená, vitaj v Zedpere

${greeting}

ďakujeme za prejavenú dôveru a využitie našich služieb.

Zedpera je úplne prvý akademický nástroj, s ktorým napíšeš celú prácu od teoretickej až po praktickú časť. Nevymýšľa si zdroje, negeneruje robotické texty, ale vytvára kvalitné výstupy, ktoré môžeš reálne použiť. Ušetrí ti množstvo času, nahradí školiteľa a dokonale ťa pripraví na obhajobu. Celú prácu napíšeš za pár dní bez akéhokoľvek podvádzania.

Zedpera sa stane tvojím osobným asistentom. Vychádza z tvojich zdrojov. Ak žiadne nemáš, nevadí, vyhľadáš ich u nás v databáze. Nemusíš byť technicky zdatný, systém je jednoduchý a zvládne ho naozaj každý.

${orderSummary}

Vitaj v Zedpere! Tu je 11 krokov, ako získať z platformy maximum a napísať skvelú prácu:

1. Nastav si profil práce. Čím viac informácií o téme a zadaní vyplníš, tým relevantnejšie výstupy dostaneš.

2. Pracuj so zdrojmi. Ak máš vlastné zdroje, vlož ich priamo do chatu. Ak ešte hľadáš, využi našu sekciu Zdroje.

3. Prekladaj okamžite. Našiel si skvelý zdroj v angličtine? Prelož si ho priamo u nás bez prepínania okien.

4. Vedúci práce k dispozícii 24/7. Keď sa zasekneš alebo školiteľ neodpisuje, náš pomocník je tu pre teba vždy, keď potrebuješ radu.

5. Audit kvality na počkanie. Chceš vedieť, či je tvoj text v poriadku? Spusti audit a za pár sekúnd získaš spätnú väzbu, čo vylepšiť.

6. Analýza dát v kocke. Nahraj dáta v Exceli a nechaj nás pripraviť štatistiky, grafy či testovanie hypotéz. Štatistu už nebudeš potrebovať.

7. Humanizácia textu. Potrebuješ upraviť tón práce, aby pôsobila prirodzenejšie? Náš nástroj ti pomôže upraviť štylistiku podľa potreby.

8. Komunikácia na úrovni. Potrebuješ napísať vedúcemu práce? Zedpera ti pomôže sformulovať profesionálny e-mail, ktorý určite zaujme.

9. Plánovanie bez stresu. Využi náš plánovač, ktorý ti rozvrhne prácu na menšie úlohy, aby si všetky termíny stihol s prehľadom.

10. Záverečná príprava na obhajobu. Nahraj hotovú prácu do systému a vygeneruj si kompletnú obhajobu vrátane poznámok k prezentácii.

11. Máš hotovo! Gratulujeme, zvládol si to.

Držíme palce pri písaní aj obhajobe.

Tím Zedpera

Pusti sa do toho:
${loginUrl}

Tento e-mail bol odoslaný automaticky po potvrdení objednávky.
  `.trim();
}

function createHtmlEmail({
  customerName,
  logoUrl,
  loginUrl,
  orderSummaryHtml,
  appUrl,
}: {
  customerName: string;
  logoUrl: string;
  loginUrl: string;
  orderSummaryHtml: string;
  appUrl: string;
}): string {
  const greeting = customerName ? `Čau ${escapeHtml(customerName)},` : "Čau,";

  const steps = [
    {
      title: "Nastav si profil práce.",
      text: "Čím viac informácií o téme a zadaní vyplníš, tým relevantnejšie výstupy dostaneš.",
    },
    {
      title: "Pracuj so zdrojmi.",
      text: "Ak máš vlastné zdroje, vlož ich priamo do chatu. Ak ešte hľadáš, využi našu sekciu Zdroje.",
    },
    {
      title: "Prekladaj okamžite.",
      text: "Našiel si skvelý zdroj v angličtine? Prelož si ho priamo u nás bez prepínania okien.",
    },
    {
      title: "Vedúci práce k dispozícii 24/7.",
      text: "Keď sa zasekneš alebo školiteľ neodpisuje, náš pomocník je tu pre teba vždy, keď potrebuješ radu.",
    },
    {
      title: "Audit kvality na počkanie.",
      text: "Chceš vedieť, či je tvoj text v poriadku? Spusti audit a za pár sekúnd získaš spätnú väzbu, čo vylepšiť.",
    },
    {
      title: "Analýza dát v kocke.",
      text: "Nahraj dáta v Exceli a nechaj nás pripraviť štatistiky, grafy či testovanie hypotéz. Štatistu už nebudeš potrebovať.",
    },
    {
      title: "Humanizácia textu.",
      text: "Potrebuješ upraviť tón práce, aby pôsobila prirodzenejšie? Náš nástroj ti pomôže upraviť štylistiku podľa potreby.",
    },
    {
      title: "Komunikácia na úrovni.",
      text: "Potrebuješ napísať vedúcemu práce? Zedpera ti pomôže sformulovať profesionálny e-mail, ktorý určite zaujme.",
    },
    {
      title: "Plánovanie bez stresu.",
      text: "Využi náš plánovač, ktorý ti rozvrhne prácu na menšie úlohy, aby si všetky termíny stihol s prehľadom.",
    },
    {
      title: "Záverečná príprava na obhajobu.",
      text: "Nahraj hotovú prácu do systému a vygeneruj si kompletnú obhajobu vrátane poznámok k prezentácii.",
    },
    {
      title: "Máš hotovo!",
      text: "Gratulujeme, zvládol si to.",
    },
  ];

  const stepsHtml = steps
    .map(
      (step, index) => `
        <tr>
          <td
            valign="top"
            style="padding:0 0 16px;"
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
            >
              <tr>
                <td
                  valign="top"
                  width="38"
                  style="width:38px;padding:1px 12px 0 0;"
                >
                  <div
                    style="
                      width:30px;
                      height:30px;
                      border-radius:999px;
                      background:#111827;
                      color:#ffffff;
                      font-size:14px;
                      font-weight:700;
                      line-height:30px;
                      text-align:center;
                    "
                  >
                    ${index + 1}
                  </div>
                </td>
                <td
                  valign="top"
                  style="
                    color:#334155;
                    font-size:15px;
                    line-height:1.65;
                  "
                >
                  <strong style="color:#111827;">
                    ${escapeHtml(step.title)}
                  </strong>
                  ${escapeHtml(step.text)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
    )
    .join("");

  return `
<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    >
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(EMAIL_SUBJECT)}</title>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:#f3f5f8;
      color:#172033;
      font-family:Arial,Helvetica,sans-serif;
    "
  >
    <div
      style="
        display:none;
        max-height:0;
        overflow:hidden;
        opacity:0;
        color:transparent;
      "
    >
      Tvoja objednávka bola úspešne potvrdená a zakúpený prístup je pripravený.
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="width:100%;background:#f3f5f8;"
    >
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              width:100%;
              max-width:700px;
              background:#ffffff;
              border:1px solid #e5e7eb;
              border-radius:18px;
              overflow:hidden;
              box-shadow:0 10px 35px rgba(15,23,42,0.08);
            "
          >
            <tr>
              <td
                align="center"
                style="padding:36px 34px 16px;"
              >
                <img
                  src="${escapeHtml(logoUrl)}"
                  alt="ZEDPERA"
                  width="190"
                  style="
                    display:block;
                    width:190px;
                    max-width:100%;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                  "
                >
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:12px 40px 42px;
                  color:#334155;
                  font-size:16px;
                  line-height:1.72;
                "
              >
                <h1
                  style="
                    margin:0 0 26px;
                    color:#111827;
                    font-size:30px;
                    line-height:1.25;
                    text-align:center;
                  "
                >
                  Tvoja objednávka je potvrdená,<br>
                  vitaj v Zedpere
                </h1>

                <p style="margin:0 0 18px;">
                  ${greeting}
                </p>

                <p style="margin:0 0 18px;">
                  ďakujeme za prejavenú dôveru a využitie našich služieb.
                </p>

                <p style="margin:0 0 18px;">
                  Zedpera je úplne prvý akademický nástroj, s ktorým napíšeš
                  celú prácu od teoretickej až po praktickú časť. Nevymýšľa si
                  zdroje, negeneruje robotické texty, ale vytvára kvalitné
                  výstupy, ktoré môžeš reálne použiť. Ušetrí ti množstvo času,
                  nahradí školiteľa a dokonale ťa pripraví na obhajobu. Celú
                  prácu napíšeš za pár dní bez akéhokoľvek podvádzania.
                </p>

                <p style="margin:0 0 28px;">
                  Zedpera sa stane tvojím osobným asistentom. Vychádza z tvojich
                  zdrojov. Ak žiadne nemáš, nevadí, vyhľadáš ich u nás v
                  databáze. Nemusíš byť technicky zdatný, systém je jednoduchý
                  a zvládne ho naozaj každý.
                </p>

                ${orderSummaryHtml}

                <h2
                  style="
                    margin:0 0 22px;
                    color:#111827;
                    font-size:22px;
                    line-height:1.4;
                  "
                >
                  Vitaj v Zedpere! Tu je 11 krokov, ako získať z platformy
                  maximum a napísať skvelú prácu:
                </h2>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  ${stepsHtml}
                </table>

                <p style="margin:16px 0 10px;">
                  Držíme palce pri písaní aj obhajobe.
                </p>

                <p style="margin:0 0 28px;">
                  <strong style="color:#111827;">Tím Zedpera</strong>
                </p>

                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="${escapeHtml(loginUrl)}"
                        style="
                          display:inline-block;
                          padding:15px 30px;
                          background:#111827;
                          color:#ffffff;
                          text-decoration:none;
                          font-size:16px;
                          font-weight:700;
                          line-height:1.2;
                          border-radius:10px;
                        "
                      >
                        Pusti sa do toho
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="
                  padding:22px 28px;
                  background:#f8fafc;
                  border-top:1px solid #e5e7eb;
                  color:#64748b;
                  font-size:12px;
                  line-height:1.6;
                "
              >
                Tento e-mail bol odoslaný automaticky po potvrdení objednávky.
                <br>
                ZEDPERA ·
                <a
                  href="${escapeHtml(appUrl)}"
                  style="color:#475569;text-decoration:underline;"
                >
                  www.zedpera.com
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

async function readResendResponse(
  response: Response,
): Promise<ResendSuccessResponse & ResendErrorResponse> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as ResendSuccessResponse & ResendErrorResponse;
  } catch {
    return {
      message: rawText,
      statusCode: response.status,
    };
  }
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationEmailInput,
): Promise<SendOrderConfirmationEmailResult> {
  const recipient = getCustomerEmail(input.session);

  if (!recipient) {
    return {
      sent: false,
      skipped: true,
      emailId: null,
      reason: "Checkout Session neobsahuje platnú e-mailovú adresu zákazníka.",
    };
  }

  const resendApiKey = getRequiredEnv("RESEND_API_KEY");
  const emailFrom = getRequiredEnv("EMAIL_FROM");
  const appUrl = getAppUrl();
  const logoUrl =
    process.env.EMAIL_LOGO_URL?.trim() || `${appUrl}/email/zedpera-logo.png`;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const orderNotificationEmail =
    process.env.ORDER_NOTIFICATION_EMAIL?.trim().toLowerCase();

  if (replyTo && !isValidEmail(replyTo)) {
    throw new Error("EMAIL_REPLY_TO nemá platný formát e-mailovej adresy.");
  }

  if (orderNotificationEmail && !isValidEmail(orderNotificationEmail)) {
    throw new Error(
      "ORDER_NOTIFICATION_EMAIL nemá platný formát e-mailovej adresy.",
    );
  }

  const locale = normalizeLocale(input.locale);
  const customerName = getCustomerName(input.session);
  const loginUrl = `${appUrl}/login`;
  const orderLines = getOrderLines(input.session, input.planId, input.addonIds);

  const orderSummaryText = createOrderSummaryText({
    lines: orderLines,
    paymentReference: input.paymentReference,
    session: input.session,
    locale,
  });

  const orderSummaryHtml = createOrderSummaryHtml({
    lines: orderLines,
    paymentReference: input.paymentReference,
    session: input.session,
    locale,
  });

  const html = createHtmlEmail({
    customerName,
    logoUrl,
    loginUrl,
    orderSummaryHtml,
    appUrl,
  });

  const text = createPlainTextEmail({
    customerName,
    loginUrl,
    orderSummary: orderSummaryText,
  });

  const bcc =
    orderNotificationEmail && orderNotificationEmail !== recipient
      ? [orderNotificationEmail]
      : undefined;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `zedpera-order-${input.session.id}`,
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [recipient],
      ...(bcc ? { bcc } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: EMAIL_SUBJECT,
      html,
      text,
      tags: [
        {
          name: "email_type",
          value: "order_confirmation",
        },
        {
          name: "stripe_mode",
          value: input.session.livemode ? "live" : "test",
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  const result = await readResendResponse(response);

  if (!response.ok) {
    throw new Error(
      result.message ||
        `Resend vrátil HTTP ${response.status} pri odosielaní objednávkového e-mailu.`,
    );
  }

  if (!result.id) {
    throw new Error(
      "Resend potvrdil požiadavku, ale nevrátil identifikátor e-mailu.",
    );
  }

  return {
    sent: true,
    skipped: false,
    emailId: result.id,
    reason: null,
  };
}
