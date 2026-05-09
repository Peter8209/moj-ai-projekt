// =====================================================
// ZEDPERA – GLOBAL API / AI ERROR MESSAGES
// =====================================================

export type ZedperaErrorInfo = {
  title: string;
  message: string;
  reason: string;
  solution: string;
  userAction: string;
  adminAction: string;
  technicalCode: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
};

function normalizeError(error: unknown) {
  if (!error) return '';

  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase();
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return String(error).toLowerCase();
  }
}

export function getZedperaErrorMessage(error: unknown): ZedperaErrorInfo {
  const text = normalizeError(error);

  // =====================================================
  // 413 / PAYLOAD TOO LARGE
  // =====================================================
  if (
    text.includes('413') ||
    text.includes('payload_too_large') ||
    text.includes('function_payload_too_large') ||
    text.includes('request entity too large') ||
    text.includes('entity too large') ||
    text.includes('body exceeded') ||
    text.includes('body size') ||
    text.includes('request body too large')
  ) {
    return {
      title: 'Súbory alebo text sú príliš veľké',
      message:
        'Požiadavka je príliš veľká na spracovanie v jednej požiadavke.',
      reason:
        'Nahrali ste príliš veľa súborov, súbor je príliš veľký alebo systém poslal do AI modelu príliš veľa textu naraz.',
      solution:
        'Nahrajte menej súborov, rozdeľte dokument na menšie časti alebo vložte iba jednu kapitolu práce.',
      userAction:
        'Odporúčame nahrať maximálne 3 súbory naraz, maximálne 10 MB na jeden súbor a maximálne 25 MB spolu.',
      adminAction:
        'Skontrolovať limity uploadu, veľkosť extrahovaného textu a neposielať celé PDF do modelu naraz. Zaviesť chunkovanie textu.',
      technicalCode: 'HTTP_413_FUNCTION_PAYLOAD_TOO_LARGE',
      severity: 'warning',
    };
  }

  // =====================================================
  // AI CONTEXT / TOKEN LIMIT
  // =====================================================
  if (
    text.includes('context length') ||
    text.includes('maximum context') ||
    text.includes('context_length_exceeded') ||
    text.includes('token limit') ||
    text.includes('too many tokens') ||
    text.includes('input is too long') ||
    text.includes('prompt is too long') ||
    text.includes('max tokens') ||
    text.includes('exceeded token')
  ) {
    return {
      title: 'Text je príliš dlhý pre vybraný AI model',
      message:
        'Vybraný AI model nedokáže spracovať taký rozsiahly text v jednej požiadavke.',
      reason:
        'Text, prílohy alebo história konverzácie prekročili maximálny kontext modelu.',
      solution:
        'Skráťte zadanie, rozdeľte dokument na kapitoly alebo skúste model vhodnejší na dlhší kontext.',
      userAction:
        'Nahrajte iba konkrétnu kapitolu alebo časť práce, ktorú chcete spracovať.',
      adminAction:
        'Obmedziť dĺžku promptu, skrátiť históriu chatu, orezať extrahovaný text alebo zaviesť sumarizáciu príloh.',
      technicalCode: 'AI_CONTEXT_LENGTH_EXCEEDED',
      severity: 'warning',
    };
  }

  // =====================================================
  // 400 BAD REQUEST
  // =====================================================
  if (
    text.includes('400') ||
    text.includes('bad request') ||
    text.includes('invalid request') ||
    text.includes('query_too_short') ||
    text.includes('text_too_short') ||
    text.includes('missing required') ||
    text.includes('invalid payload') ||
    text.includes('malformed')
  ) {
    return {
      title: 'Zadanie nie je úplné alebo má nesprávny formát',
      message:
        'Systém nedokázal požiadavku spracovať, pretože chýbajú potrebné údaje.',
      reason:
        'Chýba text, otázka, súbor, typ výstupu, profil práce alebo iný povinný údaj.',
      solution:
        'Doplňte presnejšie zadanie, tému, cieľ práce, text na spracovanie alebo nahrajte vhodný súbor.',
      userAction:
        'Skontrolujte, či ste vyplnili všetky povinné polia a zadali dostatočne dlhý text.',
      adminAction:
        'Skontrolovať validáciu request body a povinné polia v API route.',
      technicalCode: 'HTTP_400_BAD_REQUEST',
      severity: 'warning',
    };
  }

  // =====================================================
  // 401 INVALID API KEY / UNAUTHORIZED
  // =====================================================
  if (
    text.includes('401') ||
    text.includes('unauthorized') ||
    text.includes('invalid api key') ||
    text.includes('incorrect api key') ||
    text.includes('api key invalid') ||
    text.includes('no api key') ||
    text.includes('missing api key') ||
    text.includes('authentication') ||
    text.includes('auth error')
  ) {
    return {
      title: 'AI model nie je správne nastavený',
      message:
        'Aplikácia sa nevie pripojiť k vybranému AI modelu.',
      reason:
        'Chýba API kľúč, API kľúč je nesprávny alebo nie je nastavený v prostredí aplikácie.',
      solution:
        'Skontrolujte API kľúče v .env.local a vo Vercel Environment Variables.',
      userAction:
        'Skúste prepnúť na iný model. Ak chyba pretrváva, kontaktujte administrátora.',
      adminAction:
        'Skontrolovať OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, MISTRAL_API_KEY, XAI_API_KEY, GROQ_API_KEY a ďalšie premenné.',
      technicalCode: 'HTTP_401_INVALID_OR_MISSING_API_KEY',
      severity: 'critical',
    };
  }

  // =====================================================
  // 403 FORBIDDEN / PERMISSION
  // =====================================================
  if (
    text.includes('403') ||
    text.includes('forbidden') ||
    text.includes('permission denied') ||
    text.includes('access denied') ||
    text.includes('not allowed') ||
    text.includes('model access') ||
    text.includes('does not have access')
  ) {
    return {
      title: 'K modelu alebo službe nie je povolený prístup',
      message:
        'Účet nemá oprávnenie používať vybraný model alebo službu.',
      reason:
        'Model nemusí byť povolený pre daný API účet, projekt alebo región.',
      solution:
        'Skúste iný model alebo požiadajte administrátora o povolenie prístupu.',
      userAction:
        'Prepnite na iný dostupný model, napríklad GPT, Gemini alebo Mistral.',
      adminAction:
        'Skontrolovať oprávnenia v účte poskytovateľa AI a dostupnosť konkrétneho modelu.',
      technicalCode: 'HTTP_403_FORBIDDEN_MODEL_ACCESS',
      severity: 'error',
    };
  }

  // =====================================================
  // 404 MODEL NOT FOUND / ROUTE NOT FOUND
  // =====================================================
  if (
    text.includes('404') ||
    text.includes('not found') ||
    text.includes('model not found') ||
    text.includes('route not found') ||
    text.includes('endpoint not found')
  ) {
    return {
      title: 'Model alebo API endpoint sa nenašiel',
      message:
        'Aplikácia sa pokúsila použiť model alebo endpoint, ktorý neexistuje alebo nie je dostupný.',
      reason:
        'Môže byť nesprávny názov modelu, chýbajúca API route alebo zlé umiestnenie súboru v projekte.',
      solution:
        'Skúste iný model alebo kontaktujte administrátora.',
      userAction:
        'Ak chyba vznikla pri konkrétnom modeli, prepnite na iný model.',
      adminAction:
        'Skontrolovať názov modelu, API route, cestu app/api/.../route.ts a deploy na Verceli.',
      technicalCode: 'HTTP_404_MODEL_OR_ROUTE_NOT_FOUND',
      severity: 'error',
    };
  }

  // =====================================================
  // 402 PAYMENT REQUIRED / CREDIT / BILLING / QUOTA
  // =====================================================
  if (
    text.includes('402') ||
    text.includes('payment required') ||
    text.includes('billing') ||
    text.includes('credit') ||
    text.includes('credits') ||
    text.includes('insufficient_quota') ||
    text.includes('insufficient quota') ||
    text.includes('quota exceeded') ||
    text.includes('out of quota') ||
    text.includes('exceeded your current quota') ||
    text.includes('check your plan and billing') ||
    text.includes('billing hard limit') ||
    text.includes('account has insufficient balance') ||
    text.includes('balance') ||
    text.includes('prepaid') ||
    text.includes('top up') ||
    text.includes('recharge')
  ) {
    return {
      title: 'Kredit pre AI model bol vyčerpaný',
      message:
        'Vybraný AI model momentálne nemôže spracovať požiadavku, pretože API účet nemá dostupný kredit alebo kvótu.',
      reason:
        'Na účte poskytovateľa AI je vyčerpaný kredit, neaktívna fakturácia, prekročený mesačný limit alebo nastavený nízky hard limit.',
      solution:
        'Doplňte kredit, aktivujte fakturáciu alebo dočasne prepnite na iný model.',
      userAction:
        'Skúste prepnúť na iný model. Ak chyba pretrváva, počkajte na doplnenie kreditu administrátorom.',
      adminAction:
        'Doplniť kredit alebo skontrolovať billing v OpenAI, Anthropic, Google AI Studio, Mistral, Groq alebo xAI. Skontrolovať limity projektu a mesačný rozpočet.',
      technicalCode: 'AI_BILLING_OR_CREDIT_EXHAUSTED',
      severity: 'critical',
    };
  }

  // =====================================================
  // 429 RATE LIMIT
  // =====================================================
  if (
    text.includes('429') ||
    text.includes('rate limit') ||
    text.includes('rate_limit') ||
    text.includes('too many requests') ||
    text.includes('rate exceeded') ||
    text.includes('requests per minute') ||
    text.includes('tokens per minute') ||
    text.includes('rpm') ||
    text.includes('tpm') ||
    text.includes('slow down')
  ) {
    return {
      title: 'Bolo odoslaných príliš veľa požiadaviek',
      message:
        'Vybraný model alebo databáza dočasne odmietla ďalšie požiadavky.',
      reason:
        'Systém poslal veľa požiadaviek v krátkom čase alebo bol prekročený limit poskytovateľa.',
      solution:
        'Počkajte niekoľko sekúnd až minút a skúste znova. Pri zdrojoch zadajte presnejší dopyt alebo vypnite niektoré databázy.',
      userAction:
        'Skúste požiadavku zopakovať o chvíľu alebo zvoľte iný model.',
      adminAction:
        'Zaviesť retry s oneskorením, znížiť počet paralelných requestov, obmedziť arXiv/Semantic Scholar/OpenAlex volania a použiť API kľúče s vyšším limitom.',
      technicalCode: 'HTTP_429_RATE_LIMIT_EXCEEDED',
      severity: 'warning',
    };
  }

  // =====================================================
  // 500 INTERNAL SERVER ERROR
  // =====================================================
  if (
    text.includes('500') ||
    text.includes('internal server error') ||
    text.includes('server error') ||
    text.includes('sources_failed') ||
    text.includes('generation failed') ||
    text.includes('api failed') ||
    text.includes('unexpected error')
  ) {
    return {
      title: 'Nastala vnútorná chyba aplikácie',
      message:
        'Server nedokázal dokončiť spracovanie požiadavky.',
      reason:
        'Mohla nastať chyba pri spracovaní súboru, odpovede AI modelu, databázy, API volania alebo formátu dát.',
      solution:
        'Skúste požiadavku zopakovať. Ak chyba pretrváva, pošlite administrátorovi screenshot chyby.',
      userAction:
        'Skúste zadať kratší text, menší súbor alebo iný model.',
      adminAction:
        'Skontrolovať server logy, API route, JSON parsing, model response parsing a chyby vo Verceli.',
      technicalCode: 'HTTP_500_INTERNAL_SERVER_ERROR',
      severity: 'error',
    };
  }

  // =====================================================
  // 502 BAD GATEWAY
  // =====================================================
  if (
    text.includes('502') ||
    text.includes('bad gateway') ||
    text.includes('gateway error')
  ) {
    return {
      title: 'Služba AI modelu neodpovedala správne',
      message:
        'Medzi aplikáciou a poskytovateľom AI vznikla komunikačná chyba.',
      reason:
        'AI služba mohla byť dočasne nedostupná alebo vrátila neplatnú odpoveď.',
      solution:
        'Skúste požiadavku zopakovať alebo použiť iný model.',
      userAction:
        'Počkajte chvíľu a skúste znova.',
      adminAction:
        'Skontrolovať stav poskytovateľa AI a logy API volania.',
      technicalCode: 'HTTP_502_BAD_GATEWAY',
      severity: 'error',
    };
  }

  // =====================================================
  // 503 SERVICE UNAVAILABLE / OVERLOADED
  // =====================================================
  if (
    text.includes('503') ||
    text.includes('service unavailable') ||
    text.includes('model unavailable') ||
    text.includes('overloaded') ||
    text.includes('temporarily unavailable') ||
    text.includes('server overloaded') ||
    text.includes('capacity')
  ) {
    return {
      title: 'Model je dočasne nedostupný alebo preťažený',
      message:
        'Vybraný AI model momentálne nedokáže spracovať požiadavku.',
      reason:
        'Poskytovateľ modelu môže mať výpadok, vysokú záťaž alebo dočasné obmedzenie.',
      solution:
        'Skúste požiadavku zopakovať neskôr alebo prepnite na iný model.',
      userAction:
        'Použite iný model alebo skúste znova o niekoľko minút.',
      adminAction:
        'Skontrolovať status poskytovateľa AI a prípadne nastaviť fallback model.',
      technicalCode: 'HTTP_503_MODEL_UNAVAILABLE',
      severity: 'warning',
    };
  }

  // =====================================================
  // 504 TIMEOUT
  // =====================================================
  if (
    text.includes('504') ||
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('gateway timeout') ||
    text.includes('deadline exceeded') ||
    text.includes('max duration') ||
    text.includes('function timeout')
  ) {
    return {
      title: 'Spracovanie trvalo príliš dlho',
      message:
        'Server alebo AI model nestihol odpovedať v časovom limite.',
      reason:
        'Požiadavka je príliš rozsiahla, súbor je veľký, model odpovedá pomaly alebo API route prekročila maximálny čas behu.',
      solution:
        'Rozdeľte dokument na menšie časti, skráťte zadanie alebo skúste rýchlejší model.',
      userAction:
        'Nahrajte menší súbor alebo spracujte iba jednu kapitolu.',
      adminAction:
        'Zvýšiť maxDuration, optimalizovať spracovanie súborov, zaviesť asynchrónne spracovanie alebo queue.',
      technicalCode: 'HTTP_504_TIMEOUT',
      severity: 'warning',
    };
  }

  // =====================================================
  // FILE UPLOAD / EXTRACTION FAILED
  // =====================================================
  if (
    text.includes('file') ||
    text.includes('upload') ||
    text.includes('extract') ||
    text.includes('extraction') ||
    text.includes('parse') ||
    text.includes('pdf') ||
    text.includes('docx') ||
    text.includes('unsupported file') ||
    text.includes('invalid file') ||
    text.includes('corrupt') ||
    text.includes('damaged')
  ) {
    return {
      title: 'Súbor sa nepodarilo spracovať',
      message:
        'Aplikácia nedokázala bezpečne načítať alebo extrahovať text zo súboru.',
      reason:
        'Súbor môže byť poškodený, naskenovaný ako obrázok, príliš veľký, zaheslovaný alebo v nepodporovanom formáte.',
      solution:
        'Skúste nahrať menší súbor, textovú verziu dokumentu alebo skopírujte text manuálne do poľa.',
      userAction:
        'Ak ide o skenované PDF, skúste ho najprv previesť cez OCR alebo vložte text manuálne.',
      adminAction:
        'Skontrolovať upload parser, pdf-parse, mammoth, limity veľkosti a podporované MIME typy.',
      technicalCode: 'FILE_PROCESSING_FAILED',
      severity: 'warning',
    };
  }

  // =====================================================
  // PDF IS SCANNED / OCR NEEDED
  // =====================================================
  if (
    text.includes('no text found') ||
    text.includes('empty pdf') ||
    text.includes('scanned pdf') ||
    text.includes('ocr') ||
    text.includes('image-only')
  ) {
    return {
      title: 'PDF pravdepodobne obsahuje iba sken alebo obrázky',
      message:
        'Zo súboru sa nepodarilo získať čitateľný text.',
      reason:
        'PDF môže byť naskenovaný dokument bez textovej vrstvy.',
      solution:
        'Použite OCR, nahrajte textovú verziu dokumentu alebo skopírujte text ručne.',
      userAction:
        'Skúste nahrať Word dokument alebo textovú verziu PDF.',
      adminAction:
        'Doplniť OCR spracovanie alebo používateľovi zobraziť upozornenie pri image-only PDF.',
      technicalCode: 'PDF_OCR_REQUIRED',
      severity: 'warning',
    };
  }

  // =====================================================
  // JSON PARSE / INVALID AI RESPONSE
  // =====================================================
  if (
    text.includes('json') ||
    text.includes('unexpected token') ||
    text.includes('failed to parse') ||
    text.includes('invalid json') ||
    text.includes('parse error') ||
    text.includes('not valid json')
  ) {
    return {
      title: 'AI vrátila odpoveď v nesprávnom formáte',
      message:
        'Systém očakával štruktúrovanú odpoveď, ale AI model ju vrátil v inom formáte.',
      reason:
        'Model nedodržal požadovaný JSON formát alebo odpoveď bola skrátená.',
      solution:
        'Skúste požiadavku zopakovať alebo použiť iný model.',
      userAction:
        'Skúste znova. Ak chyba pretrváva, zvoľte iný model.',
      adminAction:
        'Sprísniť prompt, použiť schema output, JSON mode alebo fallback parsing.',
      technicalCode: 'AI_INVALID_JSON_RESPONSE',
      severity: 'error',
    };
  }

  // =====================================================
  // SAFETY / CONTENT BLOCKED
  // =====================================================
  if (
    text.includes('safety') ||
    text.includes('blocked') ||
    text.includes('content policy') ||
    text.includes('policy violation') ||
    text.includes('harmful') ||
    text.includes('refused') ||
    text.includes('sensitive')
  ) {
    return {
      title: 'Požiadavka bola zablokovaná bezpečnostnými pravidlami',
      message:
        'AI model odmietol spracovať obsah z bezpečnostných alebo politických dôvodov.',
      reason:
        'Text alebo požiadavka mohla obsahovať citlivý, zakázaný alebo rizikový obsah.',
      solution:
        'Upravte zadanie tak, aby bolo vecné, akademické a bezpečné.',
      userAction:
        'Preformulujte požiadavku alebo odstráňte problematickú časť textu.',
      adminAction:
        'Skontrolovať obsah requestu, model safety settings a typ požiadavky.',
      technicalCode: 'AI_SAFETY_BLOCKED',
      severity: 'warning',
    };
  }

  // =====================================================
  // NETWORK / FETCH FAILED
  // =====================================================
  if (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('econnreset') ||
    text.includes('enotfound') ||
    text.includes('connection') ||
    text.includes('socket') ||
    text.includes('dns') ||
    text.includes('failed to fetch')
  ) {
    return {
      title: 'Nepodarilo sa pripojiť k externej službe',
      message:
        'Aplikácia sa nedokázala spojiť s AI modelom, databázou alebo externým API.',
      reason:
        'Môže ísť o výpadok siete, DNS problém, výpadok poskytovateľa alebo blokované spojenie.',
      solution:
        'Skúste požiadavku zopakovať neskôr.',
      userAction:
        'Počkajte chvíľu a skúste znova.',
      adminAction:
        'Skontrolovať sieť, Vercel logy, externé API URL a status poskytovateľa.',
      technicalCode: 'NETWORK_OR_FETCH_FAILED',
      severity: 'error',
    };
  }

  // =====================================================
  // DATABASE / SUPABASE
  // =====================================================
  if (
    text.includes('database') ||
    text.includes('supabase') ||
    text.includes('postgres') ||
    text.includes('sql') ||
    text.includes('relation does not exist') ||
    text.includes('permission denied for table') ||
    text.includes('duplicate key')
  ) {
    return {
      title: 'Chyba databázy',
      message:
        'Aplikácia nedokázala uložiť alebo načítať údaje z databázy.',
      reason:
        'Môže chýbať tabuľka, oprávnenie, stĺpec alebo nastala chyba pri zápise údajov.',
      solution:
        'Skúste požiadavku zopakovať. Ak chyba pretrváva, kontaktujte administrátora.',
      userAction:
        'Skúste znovu uložiť údaje.',
      adminAction:
        'Skontrolovať Supabase tabuľky, RLS pravidlá, migrácie a SQL chybu v logoch.',
      technicalCode: 'DATABASE_ERROR',
      severity: 'error',
    };
  }

  // =====================================================
  // SOURCES / ACADEMIC DATABASES
  // =====================================================
  if (
    text.includes('semantic scholar') ||
    text.includes('openalex') ||
    text.includes('crossref') ||
    text.includes('core') ||
    text.includes('europe pmc') ||
    text.includes('arxiv') ||
    text.includes('unpaywall') ||
    text.includes('sources_failed')
  ) {
    return {
      title: 'Niektorý zdroj vedeckých databáz neodpovedal',
      message:
        'Vyhľadávanie zdrojov nebolo úplne úspešné.',
      reason:
        'Jedna z databáz mohla prekročiť limit, byť dočasne nedostupná alebo vrátila neplatnú odpoveď.',
      solution:
        'Skúste dopyt zopakovať, zadať presnejšie kľúčové slová alebo vypnúť niektoré databázy.',
      userAction:
        'Skúste jednoduchší dopyt alebo použite menej filtrov.',
      adminAction:
        'Skontrolovať API kľúče OpenAlex, Semantic Scholar, CORE, Unpaywall email a rate-limity.',
      technicalCode: 'ACADEMIC_SOURCES_PROVIDER_ERROR',
      severity: 'warning',
    };
  }

  // =====================================================
  // STRIPE / PAYMENT
  // =====================================================
  if (
    text.includes('stripe') ||
    text.includes('checkout') ||
    text.includes('payment') ||
    text.includes('webhook') ||
    text.includes('signature verification failed')
  ) {
    return {
      title: 'Chyba platby alebo aktivácie balíka',
      message:
        'Platbu alebo aktiváciu predplatného sa nepodarilo dokončiť.',
      reason:
        'Môže ísť o chybu Stripe kľúča, webhooku, podpisu alebo neúspešnú platbu.',
      solution:
        'Skúste platbu zopakovať alebo kontaktujte podporu.',
      userAction:
        'Skontrolujte platobnú kartu alebo skúste platbu znova.',
      adminAction:
        'Skontrolovať STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, webhook endpoint a Stripe event logy.',
      technicalCode: 'STRIPE_PAYMENT_OR_WEBHOOK_ERROR',
      severity: 'error',
    };
  }

  // =====================================================
  // ENVIRONMENT VARIABLES
  // =====================================================
  if (
    text.includes('env') ||
    text.includes('environment variable') ||
    text.includes('process.env') ||
    text.includes('missing environment') ||
    text.includes('undefined api')
  ) {
    return {
      title: 'Chýba nastavenie aplikácie',
      message:
        'Aplikácia nemá správne nastavenú potrebnú environment premennú.',
      reason:
        'Chýba API kľúč, webhook secret, URL databázy alebo iná konfigurácia.',
      solution:
        'Doplňte chýbajúcu premennú do .env.local a do Vercel Environment Variables.',
      userAction:
        'Kontaktujte administrátora aplikácie.',
      adminAction:
        'Skontrolovať všetky .env premenné lokálne aj na Verceli a po zmene redeploynúť aplikáciu.',
      technicalCode: 'MISSING_ENVIRONMENT_VARIABLE',
      severity: 'critical',
    };
  }

  // =====================================================
  // DEFAULT UNKNOWN ERROR
  // =====================================================
  return {
    title: 'Požiadavku sa nepodarilo spracovať',
    message:
      'Nastala neočakávaná chyba pri komunikácii s AI modelom alebo serverom.',
    reason:
      'Chyba môže súvisieť s veľkosťou vstupu, dostupnosťou modelu, API limitom, kreditom, databázou alebo technickou chybou aplikácie.',
    solution:
      'Skúste kratšie zadanie, menší súbor alebo iný model. Ak problém pretrváva, pošlite administrátorovi screenshot.',
    userAction:
      'Skúste požiadavku zopakovať alebo použiť iný model.',
    adminAction:
      'Skontrolovať server logy, Vercel logy, API odpoveď a raw error.',
    technicalCode: 'UNKNOWN_ZEDPERA_ERROR',
    severity: 'error',
  };
}

export function formatZedperaErrorForUser(error: unknown): string {
  const info = getZedperaErrorMessage(error);

  return `❌ ${info.title}

${info.message}

Dôvod:
${info.reason}

Riešenie:
${info.solution}

Čo môže urobiť používateľ:
${info.userAction}

Technický kód:
${info.technicalCode}`;
}