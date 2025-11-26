#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Name mappings for employees
const employeeNameMappings = {
  'Angeles': 'Angeles Carbajal',
  'Carlos': 'Carlos Hermosillo',
  'David': 'David Santiago',
  'Jason': 'Jason Luna',
  'Jenny': 'Jenny Reyes Ramos',
  'Jessica': 'Jessica Badejo',
  'Tim': 'Timothy Lane',
};

// Name mappings for raters/leaders
const raterNameMappings = {
  'Amanda': 'Amanda Luna',
  'Angeles': 'Angeles Carbajal',
  'Bessie': 'Bessie Anderson', // Assuming
  'Carlos': 'Carlos Hermosillo',
  'Daniel': 'Daniel Van Cleave',
  'Dom': 'Dominique Miller',
  'Doris': 'Doris Martinez', // Assuming
  'Eric': 'Eric Reyna',
  'Ethan': 'Ethan Coniker',
  'Jason': 'Jason Luna',
  'Jenny': 'Jenny Reyes Ramos',
  'Jessica': 'Jessica Badejo',
  'Kaiya': 'Kianna Ramos',
  'Kianna': 'Kianna Ramos',
  'Luke': 'Luke Kilstrom',
  'Mina': 'Mina Tieu',
  'Monica': 'Monica Coniker',
  'Nayeli': 'Nayeli Rodriguez',
  'Nestor': 'Nestor Reyes',
  'Tim': 'Timothy Lane',
  'Vanessa': 'Vanessa Hicks',
};

function fixCsvFile(inputPath, outputPath) {
  console.log(`\nProcessing: ${inputPath}`);
  
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  
  // Keep header
  const header = lines[0];
  const fixedLines = [header];
  
  let employeeFixed = 0;
  let raterFixed = 0;
  let greyca_count = 0;
  
  // Process data lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, handling quoted fields
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    
    if (parts.length < 11) continue;
    
    const uniqueId = parts[0];
    let tmName = parts[1];
    let leaderName = parts[2];
    const timestamp = parts[3];
    const position = parts[4];
    const criteria1 = parts[5];
    const criteria2 = parts[6];
    const criteria3 = parts[7];
    const criteria4 = parts[8];
    const criteria5 = parts[9];
    const rating = parts[10];
    
    // Skip Greyca ratings
    if (tmName === 'Greyca' || leaderName === 'Greyca') {
      greyca_count++;
      continue;
    }
    
    // Fix employee name
    if (employeeNameMappings[tmName]) {
      console.log(`  Employee: ${tmName} → ${employeeNameMappings[tmName]}`);
      tmName = employeeNameMappings[tmName];
      employeeFixed++;
    }
    
    // Fix rater name
    if (raterNameMappings[leaderName]) {
      console.log(`  Rater: ${leaderName} → ${raterNameMappings[leaderName]}`);
      leaderName = raterNameMappings[leaderName];
      raterFixed++;
    }
    
    // Reconstruct line
    fixedLines.push(`${uniqueId},${tmName},${leaderName},${timestamp},${position},${criteria1},${criteria2},${criteria3},${criteria4},${criteria5},${rating}`);
  }
  
  fs.writeFileSync(outputPath, fixedLines.join('\n'));
  
  console.log(`✓ Fixed ${employeeFixed} employee names`);
  console.log(`✓ Fixed ${raterFixed} rater names`);
  console.log(`✓ Skipped ${greyca_count} Greyca ratings`);
  console.log(`✓ Output: ${outputPath}`);
  console.log(`✓ Total lines: ${fixedLines.length - 1}`);
}

// Fix both CSV files
fixCsvFile(
  path.join(__dirname, '../public/04066_ratingsUpdate.csv'),
  path.join(__dirname, '../public/04066_ratingsUpdate_fixed.csv')
);

fixCsvFile(
  path.join(__dirname, '../public/05508_ratingsUpdate.csv'),
  path.join(__dirname, '../public/05508_ratingsUpdate_fixed.csv')
);

console.log('\n✓ All CSV files fixed!');

