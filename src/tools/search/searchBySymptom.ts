/**
 * Symptom-Based Drug Discovery Tool - FIXED VERSION
 * תיקון הבעיה שהחזירה 0 תוצאות
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  FindDrugsForSymptomSchema,
  FindDrugsForSymptomInput,
  McpResponse,
} from '../../types/mcp.js';
import { getApiClient } from '../../services/israelDrugsApi.js';
import { getResponseFormatter } from '../../services/responseFormatter.js';
import {
  validateToolInput,
  validateSymptomInput,
  validateHealthBasketPreference,
  validatePageIndex,
} from '../../utils/validators.js';
import { classifyError, createComprehensiveErrorResponse } from '../../utils/errorHandler.js';
import { API_BEHAVIOR, MCP_CONFIG, CLINICAL_MAPPINGS } from '../../config/constants.js';
import { SYMPTOMS_LIST } from '../../config/symptomsList.js';

type ValidatedFindDrugsForSymptomInput = FindDrugsForSymptomInput & {
  treatment_preferences?: {
    otc_preferred: boolean;
    health_basket_only: boolean;
    max_results: number;
  };
};

interface TreatmentStrategy {
  first_line_treatments: Array<{ name: string; rationale: string; safety_profile?: string; clinical_indication?: string; }>;
  alternative_options: Array<any>;
  prescription_treatments: Array<{ name: string; rationale: string; clinical_indication: string; }>;
  self_care_measures: string[];
}

// ===== TOOL REGISTRATION =====

// Build complete symptoms description dynamically
function buildSymptomsDescription(): string {
  const symptomsText = SYMPTOMS_LIST.map(category => {
    const symptoms = category.list
      .filter(s => s.bySymptomName.trim() !== '')
      .map(s => `"${s.bySymptomName}"`)
      .join(', ');
    return `**Category: "${category.bySymptomMain}"**\n  Symptoms: ${symptoms}`;
  }).join('\n\n');

  return `Clinical decision support tool that identifies appropriate medications for specific medical conditions and symptoms. This tool provides evidence-based treatment options within the Israeli healthcare system framework.

**Clinical Purpose:** Essential for therapeutic decision-making, symptom management, and treatment planning. Helps healthcare providers and informed patients identify available treatment options for specific medical conditions.

**CRITICAL: Complete List of Available Symptom Categories and Symptoms**
This tool ONLY accepts EXACT matches from the following comprehensive list. The system will reject any category or symptom not in this list. Use the exact Hebrew text as shown:

${symptomsText}

**Pagination:**
- Results are returned 10 per page (typically)
- Use 'page' parameter to navigate through results (starts from 1)
- Check totalPages in response to see if more results are available

**Treatment Preferences:**
- otc_preferred: Prioritize over-the-counter treatments when available
- health_basket_only: Show only medications covered by Israeli health basket
- max_results: Control number of treatment options (default: 20)

**Output:** Returns prioritized treatment options with clinical context, safety information, dosage guidance, and therapeutic alternatives ranked by effectiveness and safety profile.

**Clinical Context:** This tool should be used when seeking evidence-based treatment options for specific symptoms. Results include safety profiles, contraindications, and guidance for appropriate medical supervision.`;
}

export function registerSearchBySymptomTool(server: McpServer): void {
  server.registerTool(
    'find_drugs_for_symptom',
    {
      title: 'Symptom-Based Treatment Discovery',
      description: buildSymptomsDescription(),
      inputSchema: FindDrugsForSymptomSchema.shape,
    },
    async (input: FindDrugsForSymptomInput) => {
      const startTime = Date.now();

      try {
        // Validate and process input
        const { data: validatedInput, warnings } = validateToolInput(
          FindDrugsForSymptomSchema,
          input,
          'find_drugs_for_symptom',
        );

        const validatedSymptomInput: ValidatedFindDrugsForSymptomInput = validatedInput as ValidatedFindDrugsForSymptomInput;

        // Validate symptom categories
        const { category, symptom } = validateSymptomInput(
          validatedSymptomInput.primary_category,
          validatedSymptomInput.specific_symptom,
        );

        // FIXED: שיפור לוגיקת prescription filter
        // במקום determinePrescriBtionFilter משתמשים בלוגיקה הנכונה
        const prescriptionFilter = validatedSymptomInput.treatment_preferences?.otc_preferred === true
          ? API_BEHAVIOR.PRESCRIPTION_LOGIC.OTC_ONLY  // true = רק ללא מרשם
          : API_BEHAVIOR.PRESCRIPTION_LOGIC.ALL_DRUGS; // false = כל התרופות

        // Transform MCP preferences to API format
        const apiRequest = {
          primarySymp: category,
          secondarySymp: symptom,
          healthServices: validateHealthBasketPreference(
            validatedSymptomInput.treatment_preferences?.health_basket_only || false,
          ),
          pageIndex: validatePageIndex(validatedSymptomInput.page || 1),
          prescription: prescriptionFilter,
          orderBy: 5, // Use popularity-based ordering for symptoms
        };

        console.info(`Searching for drugs: ${category} → ${symptom}`);
        console.info(`API request parameters:`, {
          primarySymp: apiRequest.primarySymp,
          secondarySymp: apiRequest.secondarySymp,
          prescription: apiRequest.prescription,
          healthServices: apiRequest.healthServices,
          orderBy: apiRequest.orderBy
        });

        // Execute symptom-based search with clinical intelligence
        const searchResults = await executeSymptomSearch(apiRequest, validatedSymptomInput);

        // Format response with therapeutic intelligence
        const formatter = getResponseFormatter();
        const formattedResponse = formatter.formatDrugSearchResponse(
          searchResults.results || [],
          `${category} → ${symptom}`,
          {
            prescriptionAccess: validatedSymptomInput.treatment_preferences?.otc_preferred
              ? 'otc_only'
              : 'either',
            healthBasketOnly: validatedSymptomInput.treatment_preferences?.health_basket_only || false,
            pageIndex: 1,
          },
          startTime,
        );

        // Enhance with symptom-specific clinical intelligence
        return enhanceSymptomResponse(formattedResponse, validatedSymptomInput, warnings);
      } catch (error) {
        const classifiedError = classifyError(error, 'find_drugs_for_symptom');
        return createComprehensiveErrorResponse(classifiedError, undefined, {
          toolName: 'find_drugs_for_symptom',
          userInput: input,
          attemptNumber: 1,
        });
      }
    },
  );
}

// ===== SYMPTOM-BASED SEARCH EXECUTION =====

async function executeSymptomSearch(
  baseRequest: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Promise<any> {
  const apiClient = getApiClient();

  try {
    console.info(`Primary search attempt with parameters:`, baseRequest);
    
    // Primary symptom search
    const primaryResult = await apiClient.searchBySymptom(baseRequest);

    console.info(`Primary search returned ${primaryResult?.results?.length || 0} results`);

    // If no results found, try alternative search strategies
    if (!primaryResult.results || primaryResult.results.length === 0) {
      console.info('Primary symptom search returned no results, attempting alternative strategies');
      return await executeAlternativeSymptomSearch(baseRequest, userInput);
    }

    // Apply result limit if specified
    if (userInput.treatment_preferences?.max_results) {
      const limitedResults = {
        ...primaryResult,
        results: primaryResult.results.slice(0, userInput.treatment_preferences.max_results),
      };
      console.info(`Limited results to ${limitedResults.results.length} medications`);
      return limitedResults;
    }

    console.info(`Returning ${primaryResult.results.length} results from primary search`);
    return primaryResult;
  } catch (error) {
    console.error('Symptom search failed:', error);

    // Attempt recovery with relaxed filters
    return await attemptSymptomSearchRecovery(baseRequest, userInput);
  }
}

async function executeAlternativeSymptomSearch(
  baseRequest: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Promise<any> {
  const apiClient = getApiClient();

  // FIXED: Strategy 1 - נסה עם prescription filter הפוך
  try {
    console.info('Strategy 1: Trying with flipped prescription filter');
    
    const altPrescriptionRequest = {
      ...baseRequest,
      prescription: !baseRequest.prescription, // Flip prescription logic
    };

    console.info(`Alternative prescription request:`, altPrescriptionRequest);

    const altResult = await apiClient.searchBySymptom(altPrescriptionRequest);
    if (altResult.results && altResult.results.length > 0) {
      console.info(`Alternative prescription filter found ${altResult.results.length} results`);
      return altResult;
    }
  } catch (error) {
    console.warn('Alternative prescription search failed:', error);
  }

  // FIXED: Strategy 2 - נסה בלי סינון סל הבריאות
  try {
    console.info('Strategy 2: Trying without health basket filter');
    
    const noBasketRequest = {
      ...baseRequest,
      healthServices: false,
    };

    console.info(`No health basket request:`, noBasketRequest);

    const noBasketResult = await apiClient.searchBySymptom(noBasketRequest);
    if (noBasketResult.results && noBasketResult.results.length > 0) {
      console.info(`No health basket filter found ${noBasketResult.results.length} results`);
      return noBasketResult;
    }
  } catch (error) {
    console.warn('No health basket search failed:', error);
  }

  // FIXED: Strategy 3 - נסה עם orderBy שונה
  try {
    console.info('Strategy 3: Trying with different ordering');
    
    const altOrderRequest = {
      ...baseRequest,
      orderBy: 0, // Default ordering instead of popularity
      healthServices: false, // גם בלי סל בריאות
      prescription: API_BEHAVIOR.PRESCRIPTION_LOGIC.ALL_DRUGS // כל התרופות
    };

    console.info(`Alternative order request:`, altOrderRequest);

    const altOrderResult = await apiClient.searchBySymptom(altOrderRequest);
    if (altOrderResult.results && altOrderResult.results.length > 0) {
      console.info(`Alternative ordering found ${altOrderResult.results.length} results`);
      return altOrderResult;
    }
  } catch (error) {
    console.warn('Alternative ordering search failed:', error);
  }

  // FIXED: Strategy 4 - בדוק אם הסימפטומים תקינים
  console.info('Strategy 4: Trying with simplified symptom matching');
  
  try {
    // נסה עם קטגוריה בלבד
    const simplifiedRequest = {
      primarySymp: baseRequest.primarySymp,
      secondarySymp: "", // ריק
      healthServices: false,
      pageIndex: 1,
      prescription: API_BEHAVIOR.PRESCRIPTION_LOGIC.ALL_DRUGS,
      orderBy: 0,
    };

    console.info(`Simplified request (category only):`, simplifiedRequest);

    const simplifiedResult = await apiClient.searchBySymptom(simplifiedRequest);
    if (simplifiedResult.results && simplifiedResult.results.length > 0) {
      console.info(`Simplified search found ${simplifiedResult.results.length} results`);
      return simplifiedResult;
    }
  } catch (error) {
    console.error('All alternative symptom search strategies failed:', error);
    throw error;
  }

  // אם הגענו לכאן - אין תוצאות
  console.warn('No results found in any search strategy');
  return { results: [] };
}

async function attemptSymptomSearchRecovery(
  baseRequest: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Promise<any> {
  const apiClient = getApiClient();

  // Recovery with minimal filters - הכי פשוט שאפשר
  const recoveryRequest = {
    primarySymp: baseRequest.primarySymp,
    secondarySymp: baseRequest.secondarySymp,
    healthServices: false, // בלי סל בריאות
    pageIndex: 1,
    prescription: API_BEHAVIOR.PRESCRIPTION_LOGIC.ALL_DRUGS, // כל התרופות
    orderBy: 0, // מיון ברירת מחדל
  };

  try {
    console.info('Attempting symptom search recovery with minimal filters');
    console.info(`Recovery request:`, recoveryRequest);
    
    const recoveryResult = await apiClient.searchBySymptom(recoveryRequest);
    
    if (recoveryResult && recoveryResult.results) {
      console.info(`Recovery found ${recoveryResult.results.length} results`);
      return recoveryResult;
    } else {
      console.warn('Recovery returned no results');
      return { results: [] };
    }
  } catch (error) {
    console.error('Symptom search recovery failed:', error);
    // החזר מבנה ריק במקום לזרוק שגיאה
    return { 
      results: [],
      error: 'search_failed',
      recovery_attempted: true
    };
  }
}

// ===== HELPER FUNCTIONS =====

function enhanceSymptomResponse(
  baseResponse: any,
  userInput: ValidatedFindDrugsForSymptomInput,
  validationWarnings: string[],
): McpResponse<any> {
  // Add symptom-specific enhancements
  const enhancedResponse = {
    ...baseResponse,
    data: {
      ...baseResponse.data,
      symptom_analysis: generateSymptomAnalysis(baseResponse.data, userInput),
      treatment_strategy: generateTreatmentStrategy(baseResponse.data, userInput),
      clinical_guidance: generateClinicalGuidance(baseResponse.data, userInput),
      self_care_options: generateSelfCareOptions(baseResponse.data, userInput),
    },
  };

  // Add validation warnings
  if (validationWarnings.length > 0) {
    enhancedResponse.warnings = [...(enhancedResponse.warnings || []), ...validationWarnings];
  }

  // Enhance clinical notes with symptom-specific guidance
  enhancedResponse.clinical_notes = [
    ...enhancedResponse.clinical_notes,
    ...generateSymptomSpecificNotes(userInput),
  ];

  // Enhance next actions for symptom-based workflow
  enhancedResponse.next_suggested_actions = enhanceSymptomNextActions(
    baseResponse.next_suggested_actions || [],
    baseResponse.data,
    userInput,
  );

  return enhancedResponse;
}

function generateSymptomAnalysis(
  searchData: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Record<string, unknown> {
  const drugs = searchData.drugs || [];

  return {
    symptom_profile: {
      category: userInput.primary_category,
      specific_condition: userInput.specific_symptom,
      treatment_availability: drugs.length > 0 ? 'treatments_available' : 'limited_options',
    },
    treatment_options: {
      total_medications: drugs.length,
      otc_available: drugs.filter((d: any) => !d.requiresPrescription).length,
      prescription_required: drugs.filter((d: any) => d.requiresPrescription).length,
      health_basket_covered: drugs.filter((d: any) => d.inHealthBasket).length,
    },
    administration_routes: analyzeAdministrationRoutes(drugs),
    therapeutic_classes: analyzeTherapeuticClasses(drugs),
    severity_appropriateness: assessSeverityAppropriateness(userInput.primary_category, drugs),
  };
}

function generateTreatmentStrategy(
  searchData: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): TreatmentStrategy {
  const drugs = searchData.drugs || [];

  const strategy: TreatmentStrategy = {
    first_line_treatments: [],
    alternative_options: [],
    prescription_treatments: [],
    self_care_measures: [],
  };

  // Categorize treatments by clinical approach
  const otcDrugs = drugs.filter((d: any) => !d.requiresPrescription);
  const prescriptionDrugs = drugs.filter((d: any) => d.requiresPrescription);

  if (otcDrugs.length > 0) {
    strategy.first_line_treatments = otcDrugs.slice(0, 3).map((d: any) => ({
      name: d.hebrewName,
      rationale: 'Available without prescription for self-treatment',
      safety_profile: 'Generally well-tolerated for appropriate use',
    }));
  }

  if (prescriptionDrugs.length > 0) {
    strategy.prescription_treatments = prescriptionDrugs.slice(0, 3).map((d: any) => ({
      name: d.hebrewName,
      rationale: 'Requires medical supervision for optimal safety and effectiveness',
      clinical_indication: 'For cases requiring stronger intervention',
    }));
  }

  strategy.self_care_measures = generateSelfCareMeasures(
    userInput.primary_category,
    userInput.specific_symptom,
  );

  return strategy;
}

function generateClinicalGuidance(
  searchData: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Record<string, string[]> {
  const guidance: Record<string, string[]> = {
    immediate_care: [],
    medication_selection: [],
    monitoring_requirements: [],
    escalation_criteria: [],
  };

  const symptomCategory = userInput.primary_category;
  const specificSymptom = userInput.specific_symptom;

  // Immediate care based on symptom category
  if (symptomCategory.includes('כאב')) {
    guidance.immediate_care = [
      'Assess pain severity on scale of 1-10',
      'Consider non-pharmacological measures first',
      'Apply appropriate temperature therapy if indicated',
    ];
  } else if (symptomCategory.includes('אף-אוזן-גרון')) {
    guidance.immediate_care = [
      'Maintain adequate hydration',
      'Consider local supportive measures',
      'Monitor for signs of bacterial infection',
    ];
  }

  // Medication selection guidance
  const drugs = searchData.drugs || [];
  if (drugs.length > 0) {
    guidance.medication_selection = [
      'Start with lowest effective dose',
      'Consider patient age and comorbidities',
      'Review potential drug interactions',
      'Prefer medications with established safety profiles',
    ];
  }

  // Monitoring requirements
  guidance.monitoring_requirements = [
    'Monitor symptom progression and response to treatment',
    'Watch for adverse reactions or unexpected side effects',
    'Assess need for dose adjustment or alternative therapy',
  ];

  // Escalation criteria
  guidance.escalation_criteria = generateEscalationCriteria(symptomCategory, specificSymptom);

  return guidance;
}

function generateSelfCareOptions(
  searchData: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): Record<string, string[]> {
  const symptomCategory = userInput.primary_category;
  const specificSymptom = userInput.specific_symptom;

  const selfCare: Record<string, string[]> = {
    non_pharmacological: [],
    lifestyle_measures: [],
    when_to_seek_help: [],
  };

  // Generate symptom-specific self-care recommendations
  if (symptomCategory.includes('כאב')) {
    selfCare.non_pharmacological = [
      'Rest and activity modification',
      'Heat or cold application as appropriate',
      'Gentle stretching or movement',
      'Stress reduction techniques',
    ];
  } else if (symptomCategory.includes('גרון')) {
    selfCare.non_pharmacological = [
      'Warm salt water gargles',
      'Increased fluid intake',
      'Humidification of environment',
      'Voice rest if applicable',
    ];
  }

  selfCare.lifestyle_measures = [
    'Adequate rest and sleep',
    'Proper nutrition and hydration',
    'Avoid known triggers or irritants',
    'Maintain good hygiene practices',
  ];

  selfCare.when_to_seek_help = [
    'Symptoms worsen or persist beyond expected timeframe',
    'Development of fever or signs of infection',
    'Severe symptoms that interfere with daily activities',
    'Any concerning or unusual symptoms',
  ];

  return selfCare;
}

function analyzeAdministrationRoutes(drugs: any[]): Record<string, number> {
  const routes: Record<string, number> = {};

  drugs.forEach((drug) => {
    const route = drug.administrationRoute;
    routes[route] = (routes[route] || 0) + 1;
  });

  return routes;
}

function analyzeTherapeuticClasses(drugs: any[]): string[] {
  const classes = new Set<string>();

  drugs.forEach((drug) => {
    drug.activeIngredients.forEach((ingredient: string) => {
      // Simple therapeutic class inference based on ingredients
      if (ingredient.includes('PARACETAMOL')) classes.add('Analgesics/Antipyretics');
      if (ingredient.includes('IBUPROFEN')) classes.add('NSAIDs');
      if (ingredient.includes('LIDOCAINE')) classes.add('Local Anesthetics');
      if (ingredient.includes('LORATADINE')) classes.add('Antihistamines');
      // Add more classifications as needed
    });
  });

  return Array.from(classes);
}

function assessSeverityAppropriateness(category: string, drugs: any[]): string {
  const hasOTC = drugs.some((d: any) => !d.requiresPrescription);
  const hasPrescription = drugs.some((d: any) => d.requiresPrescription);

  if (hasOTC && hasPrescription) {
    return 'suitable_for_various_severities';
  } else if (hasOTC) {
    return 'appropriate_for_mild_to_moderate';
  } else if (hasPrescription) {
    return 'requires_medical_evaluation';
  } else {
    return 'limited_treatment_options';
  }
}

function generateSelfCareMeasures(category: string, symptom: string): string[] {
  const measures: string[] = [];

  // Category-specific self-care
  if (category.includes('כאב')) {
    measures.push('Rest and positioning', 'Temperature therapy', 'Gentle movement');
  }

  if (category.includes('גרון')) {
    measures.push('Warm fluids', 'Humidity', 'Voice rest');
  }

  if (category.includes('עיכול')) {
    measures.push('Dietary modifications', 'Adequate hydration', 'Small frequent meals');
  }

  // General measures
  measures.push('Adequate rest', 'Stress management', 'Follow-up as needed');

  return measures;
}

function generateEscalationCriteria(category: string, symptom: string): string[] {
  const criteria: string[] = [];

  // Universal escalation criteria
  criteria.push('Symptoms persist beyond expected timeframe');
  criteria.push('Worsening despite appropriate treatment');
  criteria.push('Development of new concerning symptoms');

  // Category-specific escalation
  if (category.includes('כאב')) {
    criteria.push('Severe pain not responding to standard measures');
    criteria.push('Associated neurological symptoms');
  }

  if (category.includes('גרון')) {
    criteria.push('Difficulty swallowing or breathing');
    criteria.push('High fever or signs of systemic infection');
  }

  criteria.push('Any doubt about appropriate treatment approach');

  return criteria;
}

function generateSymptomSpecificNotes(userInput: ValidatedFindDrugsForSymptomInput): string[] {
  const notes: string[] = [];
  const category = userInput.primary_category;

  if (category.includes('כאב')) {
    notes.push('Pain management should follow stepwise approach based on severity');
    notes.push('Consider both pharmacological and non-pharmacological interventions');
  }

  if (category.includes('אף-אוזן-גרון')) {
    notes.push('Many throat conditions are viral and self-limiting');
    notes.push('Symptomatic treatment often sufficient for viral conditions');
  }

  if (category.includes('אלרגיה')) {
    notes.push('Identify and avoid allergen triggers when possible');
    notes.push('Consider both immediate and long-term management strategies');
  }

  notes.push('Treatment response varies between individuals');
  notes.push('Monitor for both therapeutic effects and adverse reactions');

  return notes;
}

function enhanceSymptomNextActions(
  baseActions: any[],
  searchData: any,
  userInput: ValidatedFindDrugsForSymptomInput,
): any[] {
  const enhancedActions = [...baseActions];
  const drugs = searchData.drugs || [];

  // Add symptom-specific actions
  if (drugs.length === 0) {
    enhancedActions.unshift({
      tool: 'browse_available_symptoms',
      reason: 'Verify symptom category and explore alternatives',
      parameters_hint: 'Check available symptom categories for better matching',
    });
  }

  if (drugs.length > 0) {
    enhancedActions.push({
      tool: 'check_drug_availability_status',
      reason: 'Verify current availability of recommended treatments',
      parameters_hint: 'Check active status of identified medications',
    });
  }

  if (userInput.treatment_preferences?.health_basket_only) {
    enhancedActions.push({
      tool: 'analyze_basket_coverage',
      reason: 'Detailed analysis of health basket treatment options',
      parameters_hint: 'Include all medications found for symptom',
    });
  }

  return enhancedActions;
}