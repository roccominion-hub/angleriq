#!/usr/bin/env node
/**
 * AnglerIQ Schema Application Helper
 * 
 * Run this script to see the SQL that must be applied in the Supabase SQL editor.
 * Dashboard: https://supabase.com/dashboard/project/qotpyszkdzjxqrlzlosw/sql/new
 */

const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../src/lib/supabase/schema.sql'), 'utf8');

console.log('='.repeat(60));
console.log('APPLY THIS SQL IN THE SUPABASE SQL EDITOR:');
console.log('https://supabase.com/dashboard/project/qotpyszkdzjxqrlzlosw/sql/new');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));
