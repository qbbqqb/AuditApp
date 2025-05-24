const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testUsers = [
  {
    email: 'safety.manager@example.com',
    password: 'SecurePass123',
    userData: {
      first_name: 'Sarah',
      last_name: 'Johnson',
      role: 'client_safety_manager',
      company: 'ABC Construction Client'
    }
  },
  {
    email: 'project.manager@example.com', 
    password: 'SecurePass123',
    userData: {
      first_name: 'Michael',
      last_name: 'Chen',
      role: 'client_project_manager',
      company: 'ABC Construction Client'
    }
  },
  {
    email: 'ehs.officer@example.com',
    password: 'SecurePass123',
    userData: {
      first_name: 'Lisa',
      last_name: 'Rodriguez',
      role: 'gc_ehs_officer',
      company: 'XYZ Contracting'
    }
  },
  {
    email: 'gc.project.manager@example.com',
    password: 'SecurePass123',
    userData: {
      first_name: 'David',
      last_name: 'Thompson',
      role: 'gc_project_manager', 
      company: 'XYZ Contracting'
    }
  },
  {
    email: 'site.director@example.com',
    password: 'SecurePass123',
    userData: {
      first_name: 'Jennifer',
      last_name: 'Williams',
      role: 'gc_site_director',
      company: 'XYZ Contracting'
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users with different roles...\n');
  
  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        console.log(`❌ Error creating auth user ${user.email}:`, authError.message);
        continue;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: user.email,
          ...user.userData
        });

      if (profileError) {
        console.log(`❌ Error creating profile for ${user.email}:`, profileError.message);
        continue;
      }

      console.log(`✅ Created user: ${user.email}`);
      console.log(`   Role: ${user.userData.role}`);
      console.log(`   Name: ${user.userData.first_name} ${user.userData.last_name}`);
      console.log(`   Company: ${user.userData.company}\n`);

    } catch (error) {
      console.log(`❌ Unexpected error creating ${user.email}:`, error.message);
    }
  }
}

async function listExistingUsers() {
  console.log('📋 Current users in system:\n');
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, first_name, last_name, role, company')
    .order('created_at');

  if (error) {
    console.log('❌ Error fetching profiles:', error.message);
    return;
  }

  profiles.forEach(profile => {
    console.log(`👤 ${profile.email}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Company: ${profile.company}\n`);
  });
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'create') {
    await createTestUsers();
  } else if (command === 'list') {
    await listExistingUsers();
  } else {
    console.log('Usage:');
    console.log('  node create-test-users.js create  # Create test users');
    console.log('  node create-test-users.js list    # List existing users');
  }
}

main().catch(console.error); 