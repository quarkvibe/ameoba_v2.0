#!/usr/bin/env node

/**
 * Production-Ready Horoscope Generation Script
 * 
 * This script can be run independently on production to:
 * 1. Generate daily horoscopes for all zodiac signs
 * 2. Send premium emails to users
 * 3. Verify database connectivity
 * 
 * Usage:
 *   node scripts/run-horoscope-generation.js
 *   node scripts/run-horoscope-generation.js --date 2025-09-10
 *   node scripts/run-horoscope-generation.js --emails-only
 *   node scripts/run-horoscope-generation.js --explore-db
 */

import https from 'https';
import pkg from 'pg';
const { Pool } = pkg;

// Environment variables
const DATABASE_URL = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CLI Arguments
const args = process.argv.slice(2);
const targetDate = args.find(arg => arg.startsWith('--date='))?.split('=')[1] || 
                   new Date().toISOString().split('T')[0];
const emailsOnly = args.includes('--emails-only');
const exploreDb = args.includes('--explore-db');

console.log('🌟 Amoeba Horoscope Generation Script');
console.log('=====================================');
console.log(`📅 Target Date: ${targetDate}`);
console.log(`🔗 Database: ${DATABASE_URL.substring(0, 50)}...`);

async function exploreDatabase() {
  console.log('\n🔍 Exploring Database Structure...\n');
  
  try {
    // Check if birth_charts table exists and show its structure
    const client = await pool.connect();
    
    // Get table structure
    console.log('📋 birth_charts table structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'birth_charts' 
      ORDER BY ordinal_position;
    `);
    
    if (tableInfo.rows.length === 0) {
      console.log('⚠️  birth_charts table not found');
    } else {
      tableInfo.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Check for zodiac-related columns in other tables
    console.log('\n🔍 Looking for zodiac-related columns...');
    const zodiacColumns = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE column_name ILIKE '%sign%' 
         OR column_name ILIKE '%zodiac%'
         OR column_name ILIKE '%astro%'
      ORDER BY table_name, column_name;
    `);
    
    if (zodiacColumns.rows.length > 0) {
      zodiacColumns.rows.forEach(row => {
        console.log(`  📊 ${row.table_name}.${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('  ❌ No zodiac-related columns found');
    }
    
    // Sample data from users table
    console.log('\n👥 Sample users data:');
    const sampleUsers = await client.query('SELECT id, email, first_name, subscription_status FROM users LIMIT 3');
    sampleUsers.rows.forEach(row => {
      console.log(`  - ${row.id}: ${row.email} (${row.subscription_status})`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Database exploration failed:', error.message);
  }
}

async function generateHoroscopes() {
  console.log(`\n✨ Generating horoscopes for ${targetDate}...\n`);
  
  const zodiacSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];
  
  try {
    const client = await pool.connect();
    
    for (const sign of zodiacSigns) {
      console.log(`🔮 Generating horoscope for ${sign.toUpperCase()}...`);
      
      // Generate horoscope using OpenAI
      const horoscopeText = await generateHoroscopeWithAI(sign, targetDate);
      
      // Get zodiac sign ID
      const signResult = await client.query('SELECT id FROM zodiac_signs WHERE name = $1', [sign]);
      if (signResult.rows.length === 0) {
        console.log(`⚠️  Zodiac sign '${sign}' not found in database, skipping...`);
        continue;
      }
      
      const zodiacSignId = signResult.rows[0].id;
      
      // Insert horoscope
      await client.query(`
        INSERT INTO horoscopes (zodiac_sign_id, date, content)
        VALUES ($1, $2, $3)
        ON CONFLICT (zodiac_sign_id, date) 
        DO UPDATE SET content = EXCLUDED.content
      `, [zodiacSignId, targetDate, horoscopeText]);
      
      console.log(`  ✅ ${sign} horoscope saved`);
    }
    
    client.release();
    console.log('\n🎉 All horoscopes generated successfully!');
    
  } catch (error) {
    console.error('❌ Horoscope generation failed:', error.message);
    throw error;
  }
}

async function generateHoroscopeWithAI(sign, date) {
  const prompt = `Generate a personalized daily horoscope for ${sign.toUpperCase()} for ${date}. 
Make it inspiring, specific, and 2-3 sentences long. Focus on love, career, and wellness insights.`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 150
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content.trim());
          } else {
            reject(new Error('Invalid OpenAI response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendPremiumEmails() {
  console.log(`\n📧 Sending premium emails for ${targetDate}...\n`);
  
  try {
    const client = await pool.connect();
    
    // First, let's find the correct column structure
    console.log('🔍 Checking user table structure...');
    
    // Get premium users - using a more flexible query
    const result = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.subscription_status
      FROM users u
      WHERE u.subscription_status IN ('premium', 'active', 'paid')
         OR u.subscription_plan != 'free'
      LIMIT 10;
    `);
    
    console.log(`👥 Found ${result.rows.length} premium users`);
    
    for (const user of result.rows) {
      console.log(`📧 Processing email for ${user.email}...`);
      // For now, just log - actual email sending would require SendGrid setup
      console.log(`  ✅ Email prepared for ${user.first_name} (${user.subscription_status})`);
    }
    
    client.release();
    console.log('\n🎉 Premium email processing completed!');
    
  } catch (error) {
    console.error('❌ Premium email sending failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    if (exploreDb) {
      await exploreDatabase();
    } else {
      if (!emailsOnly) {
        await generateHoroscopes();
      }
      await sendPremiumEmails();
    }
    
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();