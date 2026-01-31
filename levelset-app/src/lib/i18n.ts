/**
 * i18n Configuration
 * Internationalization setup for English and Spanish
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English translations
const en = {
  common: {
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    clear: "Clear",
    done: "Done",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    required: "Required",
    optional: "Optional",
    select: "Select...",
    search: "Search...",
    noResults: "No results found",
    pullToRefresh: "Pull to refresh",
    tryAgain: "Try Again",
  },
  forms: {
    // Form titles
    positionalRatings: "Positional Ratings",
    disciplineInfraction: "Discipline Infraction",

    // Common
    submitSuccess: "Form submitted successfully!",
    submitError: "Failed to submit form. Please try again.",

    // Rating labels
    notYet: "Not Yet",
    onTheRise: "On the Rise",
    crushingIt: "Crushing It",

    // Points categories
    negativePoints: "Negative Points",
    zeroPoints: "Zero Points",
    positivePoints: "Positive Points",

    // Infraction form fields
    infraction: {
      leader: "Leader",
      leaderHelper: "Who is submitting this infraction?",
      employee: "Team Member",
      employeeHelper: "Select the team member involved",
      date: "Infraction Date",
      dateHelper: "When did this occur?",
      infraction: "Infraction Type",
      infractionHelper: "Select the type of infraction",
      selectInfraction: "Select infraction...",
      points: "Points",
      acknowledged: "Team member acknowledges infraction",
      acknowledgedHelper: "Check if team member is present and acknowledging",
      notes: "Notes",
      notesPlaceholder: "Additional details about the infraction (optional)",
      notesHelper: "Optional: Add any relevant context or details",
      teamSignature: "Team Member Signature",
      teamSignatureRequired: "Required for this infraction type",
      teamSignatureHelperPresent: "Team member must sign to acknowledge",
      teamSignatureHelperAbsent: "Optional if team member is not present",
      leaderSignature: "Leader Signature",
      leaderSignatureHelper: "Your signature is required to submit",
      leaderSignatureRequired: "Required for this infraction type",
    },

    // Ratings form fields
    ratings: {
      leader: "Leader",
      leaderHelper: "Who is performing this evaluation?",
      employee: "Team Member",
      employeeHelper: "Select the team member to evaluate",
      position: "Position",
      positionHelper: "Select the position to rate",
      selectPosition: "Select position...",
      loadingCriteria: "Loading criteria...",
      ratePerformance: "Rate Performance",
      additionalDetails: "Additional Details",
      additionalDetailsHelper: "Optional: Provide specific feedback to help them grow",
      additionalDetailsRequiredHelper: "Required: Please provide specific feedback",
      additionalDetailsPlaceholder: "What specific behaviors should they continue or improve?",
      feedbackTitle: "Remember to Give Feedback",
      feedbackBody: "Take a moment to share this evaluation with {{name}} and discuss specific ways they can improve or continue excelling.",
    },
  },
  schedule: {
    mySchedule: "My Schedule",
    staff: "Staff",
    scheduling: "Scheduling",
    timeOff: "Time Off",
    settings: "Settings",
    noShifts: "No Upcoming Shifts",
    noShiftsDescription: "Your schedule will appear here once available.",
  },
  profile: {
    signOut: "Sign Out",
    language: "Language",
    version: "Version",
    notLoggedIn: "Not Logged In",
    signInPrompt: "Please sign in to continue",
  },
};

// Spanish translations
const es = {
  common: {
    submit: "Enviar",
    cancel: "Cancelar",
    save: "Guardar",
    close: "Cerrar",
    clear: "Limpiar",
    done: "Listo",
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    required: "Requerido",
    optional: "Opcional",
    select: "Seleccionar...",
    search: "Buscar...",
    noResults: "No se encontraron resultados",
    pullToRefresh: "Desliza para actualizar",
    tryAgain: "Intentar de nuevo",
  },
  forms: {
    // Form titles
    positionalRatings: "Calificaciones de Posición",
    disciplineInfraction: "Infracción Disciplinaria",

    // Common
    submitSuccess: "¡Formulario enviado exitosamente!",
    submitError: "Error al enviar el formulario. Por favor intente de nuevo.",

    // Rating labels
    notYet: "Todavía No",
    onTheRise: "En Progreso",
    crushingIt: "Excelente",

    // Points categories
    negativePoints: "Puntos Negativos",
    zeroPoints: "Cero Puntos",
    positivePoints: "Puntos Positivos",

    // Infraction form fields
    infraction: {
      leader: "Líder",
      leaderHelper: "¿Quién está enviando esta infracción?",
      employee: "Miembro del Equipo",
      employeeHelper: "Seleccione al miembro del equipo involucrado",
      date: "Fecha de Infracción",
      dateHelper: "¿Cuándo ocurrió esto?",
      infraction: "Tipo de Infracción",
      infractionHelper: "Seleccione el tipo de infracción",
      selectInfraction: "Seleccionar infracción...",
      points: "Puntos",
      acknowledged: "El miembro del equipo reconoce la infracción",
      acknowledgedHelper: "Marque si el miembro del equipo está presente y reconoce",
      notes: "Notas",
      notesPlaceholder: "Detalles adicionales sobre la infracción (opcional)",
      notesHelper: "Opcional: Agregue cualquier contexto o detalle relevante",
      teamSignature: "Firma del Miembro del Equipo",
      teamSignatureRequired: "Requerido para este tipo de infracción",
      teamSignatureHelperPresent: "El miembro del equipo debe firmar para reconocer",
      teamSignatureHelperAbsent: "Opcional si el miembro del equipo no está presente",
      leaderSignature: "Firma del Líder",
      leaderSignatureHelper: "Su firma es requerida para enviar",
      leaderSignatureRequired: "Requerido para este tipo de infracción",
    },

    // Ratings form fields
    ratings: {
      leader: "Líder",
      leaderHelper: "¿Quién está realizando esta evaluación?",
      employee: "Miembro del Equipo",
      employeeHelper: "Seleccione al miembro del equipo a evaluar",
      position: "Posición",
      positionHelper: "Seleccione la posición a calificar",
      selectPosition: "Seleccionar posición...",
      loadingCriteria: "Cargando criterios...",
      ratePerformance: "Calificar Desempeño",
      additionalDetails: "Detalles Adicionales",
      additionalDetailsHelper: "Opcional: Proporcione comentarios específicos para ayudarles a crecer",
      additionalDetailsRequiredHelper: "Requerido: Por favor proporcione comentarios específicos",
      additionalDetailsPlaceholder: "¿Qué comportamientos específicos deberían continuar o mejorar?",
      feedbackTitle: "Recuerde Dar Retroalimentación",
      feedbackBody: "Tómese un momento para compartir esta evaluación con {{name}} y discutir formas específicas en que pueden mejorar o seguir sobresaliendo.",
    },
  },
  schedule: {
    mySchedule: "Mi Horario",
    staff: "Personal",
    scheduling: "Programación",
    timeOff: "Tiempo Libre",
    settings: "Configuración",
    noShifts: "Sin Turnos Próximos",
    noShiftsDescription: "Su horario aparecerá aquí cuando esté disponible.",
  },
  profile: {
    signOut: "Cerrar Sesión",
    language: "Idioma",
    version: "Versión",
    notLoggedIn: "No ha iniciado sesión",
    signInPrompt: "Por favor inicie sesión para continuar",
  },
};

// Initialize i18n
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

export default i18n;
