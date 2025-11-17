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

// Comprehensive Big 5 label translations
// All position-specific Big 5 competency labels
const big5LabelTranslations: Record<string, string> = {
  // Common labels
  'Speed': 'Velocidad',
  'Quality': 'Calidad',
  'Cleanliness': 'Limpieza',
  'Hospitality': 'Hospitalidad',
  'Hustle': 'Esfuerzo',
  'Teamwork': 'Trabajo en Equipo',
  'Communication': 'Comunicación',
  'Accuracy': 'Precisión',
  'Efficiency': 'Eficiencia',
  'Attention to Detail': 'Atención al Detalle',
  'Customer Service': 'Servicio al Cliente',
  'Food Safety': 'Seguridad Alimentaria',
  'Time Management': 'Manejo del Tiempo',
  'Initiative': 'Iniciativa',
  'Reliability': 'Confiabilidad',
  'Humility': 'Humildad',
  'Attendance & Appearance': 'Asistencia y Apariencia',
  'Recommended to proceed': 'Recomendado para continuar',
  
  // FOH Position Labels
  'Smile & Shine': 'Sonríe y Brilla',
  'Greet & Seat': 'Saluda y Asienta',
  'Lead, Offer, Repeat': 'Dirige, Ofrece, Repite',
  'Welcoming Environment & PPG': 'Ambiente Acogedor y PPG',
  'Friendly Farewell': 'Despedida Amigable',
  'Catch Every Detail': 'Captura Cada Detalle',
  'Close Gaps & Call It Out': 'Cierra Brechas y Dilo',
  'Close Gaps & Call it Out': 'Cierra Brechas y Dilo',
  'Grab & Go': 'Toma y Ve',
  'Match & Hand Off': 'Empareja y Entrega',
  'Match & Hand-Off': 'Empareja y Entrega',
  'Add Value Always': 'Añade Valor Siempre',
  'Bump & Bag': 'Empuja y Embolsa',
  'Pull & Organize': 'Tira y Organiza',
  'Flow & Go': 'Fluye y Ve',
  'Print & Stage': 'Imprime y Prepara',
  'Echo Holds': 'Repite Retenciones',
  
  // Drinks Position Labels
  'Scoop & Serve': 'Sirve y Sirve',
  'Clean & Crisp': 'Limpio y Fresco',
  'Lid & Label': 'Tapa y Etiqueta',
  'Slide & Organize': 'Desliza y Organiza',
  'Communicate & Team Up': 'Comunica y Trabaja en Equipo',
  'Supply & Boost': 'Suministra y Aumenta',
  'Prep & Pour': 'Prepara y Vierte',
  'Dessert & Deliver': 'Postre y Entrega',
  'Clean & Clear': 'Limpio y Claro',
  'Prioritize & Respond': 'Prioriza y Responde',
  
  // BOH Position Labels
  'Drop with Purpose': 'Suelta con Propósito',
  'Bread with Precision': 'Empana con Precisión',
  'Load with Discipline': 'Carga con Disciplina',
  'Clean as You Go': 'Limpia Mientras Avanzas',
  'Protect the Zone': 'Protege la Zona',
  'Assemble with Accuracy': 'Ensambla con Precisión',
  'Stock & Support the Line': 'Abastece y Apoya la Línea',
  'Check Quality & Temp Everything': 'Verifica Calidad y Temp de Todo',
  'Flow & Rotate': 'Fluye y Rota',
  'Drop with Timing': 'Suelta con Tiempo',
  'Fry & Finish Right': 'Fríe y Termina Bien',
  'Stage for Quality & Speed': 'Prepara para Calidad y Velocidad',
  'Watch & Rotate': 'Observa y Rota',
  'Drop with Discipline': 'Suelta con Disciplina',
  'Set & Secure': 'Configura y Asegura',
  'Call the Drops': 'Anuncia las Sueltas',
  
  // Leadership Labels
  'Lead the Zone': 'Dirige la Zona',
  'Engage the team': 'Involucra al Equipo',
  'Champion the Guest Experience': 'Defiende la Experiencia del Huésped',
  'Hold the Standards': 'Mantén los Estándares',
  'Lead Yourself First': 'Dirígete a Ti Mismo Primero',
  
  // Training Labels
  'Engage With Energy': 'Involúcrate con Energía',
  'Model Excellence': 'Modela la Excelencia',
  'Train with Clarity': 'Entrena con Claridad',
  'Celebrate & Challenge': 'Celebra y Desafía',
  'Grow the Future': 'Haz Crecer el Futuro',
};

async function populateBig5LabelTranslations() {
  console.log('🌍 Populating Big 5 label Spanish translations...\n');
  console.log('='.repeat(60) + '\n');

  // First, get all unique label combinations
  const { data: allLabels, error: fetchError } = await supabase
    .from('position_big5_labels')
    .select('id, position, label_1, label_2, label_3, label_4, label_5, label_1_es, label_2_es, label_3_es, label_4_es, label_5_es');

  if (fetchError) {
    console.error('❌ Error fetching labels:', fetchError);
    process.exit(1);
  }

  if (!allLabels || allLabels.length === 0) {
    console.log('ℹ️  No labels found in database');
    process.exit(0);
  }

  console.log(`📊 Found ${allLabels.length} position label rows\n`);

  // Translate each label
  const translateLabel = (label: string | null): string | null => {
    if (!label) return null;
    return big5LabelTranslations[label.trim()] || label;
  };

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of allLabels) {
    const translations = {
      label_1_es: translateLabel(row.label_1),
      label_2_es: translateLabel(row.label_2),
      label_3_es: translateLabel(row.label_3),
      label_4_es: translateLabel(row.label_4),
      label_5_es: translateLabel(row.label_5),
    };

    // Check if translations are already correct (not just populated)
    // We'll update if any translation is missing or if it matches the English (meaning it wasn't translated)
    const needsUpdate = 
      !translations.label_1_es || !row.label_1_es || row.label_1_es === row.label_1 ||
      !translations.label_2_es || !row.label_2_es || row.label_2_es === row.label_2 ||
      !translations.label_3_es || !row.label_3_es || row.label_3_es === row.label_3 ||
      !translations.label_4_es || !row.label_4_es || row.label_4_es === row.label_4 ||
      !translations.label_5_es || !row.label_5_es || row.label_5_es === row.label_5;

    if (!needsUpdate) {
      skippedCount++;
      continue;
    }

    const { error } = await supabase
      .from('position_big5_labels')
      .update(translations)
      .eq('id', row.id);

    if (error) {
      console.warn(`    ⚠️  Could not update ${row.position}: ${error.message}`);
    } else {
      console.log(`    ✅ Updated ${row.position}`);
      console.log(`       ${row.label_1} → ${translations.label_1_es}`);
      console.log(`       ${row.label_2} → ${translations.label_2_es}`);
      console.log(`       ${row.label_3} → ${translations.label_3_es}`);
      console.log(`       ${row.label_4} → ${translations.label_4_es}`);
      console.log(`       ${row.label_5} → ${translations.label_5_es}`);
      console.log('');
      updatedCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ Updated ${updatedCount} position label set(s)`);
  if (skippedCount > 0) {
    console.log(`ℹ️  Skipped ${skippedCount} already translated row(s)`);
  }
  console.log('');

  // Check for any untranslated labels
  const { data: untranslated, error: checkError } = await supabase
    .from('position_big5_labels')
    .select('position, label_1, label_2, label_3, label_4, label_5, label_1_es, label_2_es, label_3_es, label_4_es, label_5_es')
    .or('label_1_es.is.null,label_2_es.is.null,label_3_es.is.null,label_4_es.is.null,label_5_es.is.null');

  if (!checkError && untranslated && untranslated.length > 0) {
    console.log('📋 Labels still needing translation:');
    const uniqueLabels = new Set<string>();
    untranslated.forEach(row => {
      [row.label_1, row.label_2, row.label_3, row.label_4, row.label_5].forEach(label => {
        if (label && !big5LabelTranslations[label.trim()]) {
          uniqueLabels.add(label);
        }
      });
    });
    
    if (uniqueLabels.size > 0) {
      console.log('\n  Missing translations for these labels:');
      Array.from(uniqueLabels).sort().forEach(label => {
        console.log(`    - "${label}"`);
      });
      console.log('\n  💡 Add these to the big5LabelTranslations object in the script\n');
    }
  } else {
    console.log('✅ All Big 5 labels now have Spanish translations!\n');
  }
}

populateBig5LabelTranslations().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

