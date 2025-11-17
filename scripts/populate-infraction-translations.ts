import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Comprehensive infraction translations
const infractionTranslations: Record<string, string> = {
  'Elite Performance / Above & Beyond Standards': 'Rendimiento Élite / Más Allá de los Estándares',
  'Covering Hours for a Team Member': 'Cubrir Horas para un Miembro del Equipo',
  'Staying Significantly Later for Support': 'Quedarse Significativamente Más Tarde para Apoyo',
  'Picking Up A Shift': 'Tomar un Turno',
  'Tardy (more than 5 minutes)': 'Tardanza (más de 5 minutos)',
  'Uniform/Appearance': 'Uniforme/Apariencia',
  'Food Safety': 'Seguridad Alimentaria',
  'Late from Break (more than 5 minutes)': 'Tarde del Descanso (más de 5 minutos)',
  'Leaving without completing tasks': 'Salir sin Completar Tareas',
  'Values Violation - Humility': 'Violación de Valores - Humildad',
  'Values Violation - Hospitality': 'Violación de Valores - Hospitalidad',
  'Values Violation - Hustle': 'Violación de Valores - Esfuerzo',
  'Use of Manager PIN without consent': 'Uso de PIN de Gerente sin Consentimiento',
  'Call-outs WITHOUT documentation': 'Ausencias SIN Documentación',
  'Insubordination': 'Insubordinación',
  'NO CALL-NO SHOW': 'SIN LLAMADA - SIN PRESENTARSE',
  'Inappropriate Conduct (language, horseplay, etc)': 'Conducta Inapropiada (lenguaje, juegos bruscos, etc)',
  'Harassment': 'Acoso',
  'Violence': 'Violencia',
  'Theft (product, time, money)': 'Robo (producto, tiempo, dinero)',
  'Discount Abuse (unauthorized discount given)': 'Abuso de Descuento (descuento no autorizado dado)',
};

async function populateInfractionTranslations() {
  console.log('🌍 Populating infraction Spanish translations...\n');
  console.log('='.repeat(60) + '\n');

  let updatedCount = 0;
  let notFoundCount = 0;

  for (const [english, spanish] of Object.entries(infractionTranslations)) {
    const { data, error } = await supabase
      .from('infractions_rubric')
      .update({ action_es: spanish })
      .eq('action', english)
      .select('id');

    if (error) {
      console.warn(`    ⚠️  Could not update "${english}": ${error.message}`);
    } else {
      const count = data?.length || 0;
      if (count > 0) {
        console.log(`    ✅ Updated ${count} row(s) for "${english}" → "${spanish}"`);
        updatedCount += count;
      } else {
        console.log(`    ℹ️  No rows found for: "${english}"`);
        notFoundCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated ${updatedCount} infraction translation(s)`);
  if (notFoundCount > 0) {
    console.log(`ℹ️  ${notFoundCount} infraction(s) not found in database`);
  }
  console.log('');

  // Verify what's left
  const { data: remaining, error: remainingError } = await supabase
    .from('infractions_rubric')
    .select('id, action, action_es, points')
    .is('action_es', null)
    .order('points');

  if (!remainingError && remaining && remaining.length > 0) {
    console.log('📋 Infractions still missing translations:');
    remaining.forEach(inf => {
      console.log(`    - "${inf.action}" (${inf.points} points)`);
    });
    console.log('');
  } else if (!remainingError) {
    console.log('✅ All infractions now have Spanish translations!\n');
  }
}

populateInfractionTranslations().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

