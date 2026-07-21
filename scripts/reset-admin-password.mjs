import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const newPassword =
  process.env.ADMIN_NEW_PASSWORD;

const targetEmail = 'admin@zedpera.com';

if (!supabaseUrl) {
  throw new Error(
    'Chýba NEXT_PUBLIC_SUPABASE_URL v .env.local.',
  );
}

if (!serviceRoleKey) {
  throw new Error(
    'Chýba SUPABASE_SERVICE_ROLE_KEY v .env.local.',
  );
}

if (!newPassword) {
  throw new Error(
    'Chýba ADMIN_NEW_PASSWORD.',
  );
}

if (
  !supabaseUrl.includes(
    'ixvpukjtasgwbjvbzpmi.supabase.co',
  )
) {
  throw new Error(
    `Nesprávny Supabase projekt: ${supabaseUrl}`,
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

let targetUser = null;
let page = 1;

while (!targetUser) {
  const { data, error } =
    await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

  if (error) {
    throw new Error(
      `Načítanie používateľov zlyhalo: ${error.message}`,
    );
  }

  targetUser = data.users.find(
    (user) =>
      user.email?.trim().toLowerCase() ===
      targetEmail,
  );

  if (
    targetUser ||
    data.users.length < 1000
  ) {
    break;
  }

  page += 1;
}

if (!targetUser) {
  throw new Error(
    `Používateľ ${targetEmail} neexistuje.`,
  );
}

const { data, error } =
  await supabase.auth.admin.updateUserById(
    targetUser.id,
    {
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        ...targetUser.user_metadata,
        display_name: 'Admin',
        full_name: 'Admin',
      },
    },
  );

if (error) {
  throw new Error(
    `Zmena hesla zlyhala: ${error.message}`,
  );
}

console.log('');
console.log('Admin heslo bolo úspešne nastavené.');
console.log('Projekt:', supabaseUrl);
console.log('UID:', data.user.id);
console.log('E-mail:', data.user.email);
console.log(
  'E-mail potvrdený:',
  Boolean(data.user.email_confirmed_at),
);