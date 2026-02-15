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
    discard: "Discard",
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
    comingSoon: "Coming soon",
    signHere: "Sign here",
    signed: "Signed",
  },
  home: {
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    loadingLocation: "Loading location data...",
    submittedSuccess: "Submitted successfully",
    submitRating: "Submit a Rating",
    submitRatingDesc: "Record Big 5 competency scores",
    submitInfraction: "Submit an Infraction",
    submitInfractionDesc: "Log infractions and capture signatures",
    manageTeam: "Manage Team",
    noLocation: "No location selected",
    noLocationDesc: "Select a location from the bar above to get started",
  },
  forms: {
    // Form titles
    positionalRatings: "Positional Ratings",
    disciplineInfraction: "Discipline Infraction",
    title: "Forms",
    subtitle: "Submit team evaluations and documentation",
    selectLocationPrompt: "Select a location to access forms",
    infoText: "Forms will be submitted to the Levelset system. Make sure you have an internet connection before submitting.",
    ratingsDesc: "Record Big 5 competency scores for team members",
    infractionsDesc: "Log infractions and capture acknowledgements",

    // Discard dialog
    discardTitle: "Discard Changes?",
    discardMessage: "You have unsaved changes. Are you sure you want to close this form?",

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
  resources: {
    title: "Resources",
    subtitle: "Quick access to web resources and documentation",
    linksInfo: "Links will open in your default browser",
    unableToOpen: "Unable to open this link",
    somethingWrong: "Something went wrong. Please try again.",
    // Resource items
    dashboard: "Levelset Dashboard",
    dashboardDesc: "Access the full Levelset web application",
    training: "Training Materials",
    trainingDesc: "View training guides and documentation",
    reports: "Team Reports",
    reportsDesc: "View team performance and metrics",
    helpSupport: "Help & Support",
    helpSupportDesc: "Get help with Levelset features",
  },
  location: {
    changeLocation: "Change location",
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
    title: "Profile",
    signOut: "Sign Out",
    signOutConfirm: "Are you sure you want to sign out?",
    language: "Language",
    languageDescription: "App language preference",
    version: "Version",
    settings: "Settings",
    notLoggedIn: "Not Logged In",
    signInPrompt: "Please sign in to continue",
  },
  tabs: {
    home: "Home",
    resources: "Resources",
    forms: "Forms",
    schedule: "Schedule",
    profile: "Profile",
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
    discard: "Descartar",
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
    comingSoon: "Próximamente",
    signHere: "Firme aquí",
    signed: "Firmado",
  },
  home: {
    goodMorning: "Buenos días",
    goodAfternoon: "Buenas tardes",
    goodEvening: "Buenas noches",
    loadingLocation: "Cargando datos de ubicación...",
    submittedSuccess: "Enviado exitosamente",
    submitRating: "Enviar una Calificación",
    submitRatingDesc: "Registrar puntajes de competencias Big 5",
    submitInfraction: "Enviar una Infracción",
    submitInfractionDesc: "Registrar infracciones y capturar firmas",
    manageTeam: "Gestionar Equipo",
    noLocation: "Ninguna ubicación seleccionada",
    noLocationDesc: "Selecciona una ubicación de la barra superior para comenzar",
  },
  forms: {
    // Form titles
    positionalRatings: "Calificaciones de Posición",
    disciplineInfraction: "Infracción Disciplinaria",
    title: "Formularios",
    subtitle: "Enviar evaluaciones de equipo y documentación",
    selectLocationPrompt: "Selecciona una ubicación para acceder a los formularios",
    infoText: "Los formularios se enviarán al sistema Levelset. Asegúrate de tener conexión a internet antes de enviar.",
    ratingsDesc: "Registrar puntajes de competencias Big 5 para miembros del equipo",
    infractionsDesc: "Registrar infracciones y capturar reconocimientos",

    // Discard dialog
    discardTitle: "¿Descartar cambios?",
    discardMessage: "Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar este formulario?",

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
  resources: {
    title: "Recursos",
    subtitle: "Acceso rápido a recursos web y documentación",
    linksInfo: "Los enlaces se abrirán en su navegador predeterminado",
    unableToOpen: "No se puede abrir este enlace",
    somethingWrong: "Algo salió mal. Por favor intente de nuevo.",
    // Resource items
    dashboard: "Panel de Levelset",
    dashboardDesc: "Accede a la aplicación web completa de Levelset",
    training: "Materiales de Capacitación",
    trainingDesc: "Ver guías de capacitación y documentación",
    reports: "Informes del Equipo",
    reportsDesc: "Ver rendimiento y métricas del equipo",
    helpSupport: "Ayuda y Soporte",
    helpSupportDesc: "Obtén ayuda con las funciones de Levelset",
  },
  location: {
    changeLocation: "Cambiar ubicación",
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
    title: "Perfil",
    signOut: "Cerrar Sesión",
    signOutConfirm: "¿Estás seguro de que quieres cerrar sesión?",
    language: "Idioma",
    languageDescription: "Preferencia de idioma de la aplicación",
    version: "Versión",
    settings: "Configuración",
    notLoggedIn: "No ha iniciado sesión",
    signInPrompt: "Por favor inicie sesión para continuar",
  },
  tabs: {
    home: "Inicio",
    resources: "Recursos",
    forms: "Formularios",
    schedule: "Horario",
    profile: "Perfil",
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
