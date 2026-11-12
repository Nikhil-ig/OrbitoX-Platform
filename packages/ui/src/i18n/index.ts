/**
 * Internationalization (i18n) Engine for packages/ui.
 * Default locale is 'en-IN' (Indian English); 'hi-IN' (Hindi) is scaffolded and fully supported.
 * All component UI strings must be resolved via t() or provided as props.
 */

export type Locale = 'en-IN' | 'hi-IN';

export const MESSAGES: Record<Locale, Record<string, string>> = {
  'en-IN': {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.search': 'Search...',
    'common.reveal': 'Reveal',
    'common.hide': 'Hide',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.retry': 'Retry',
    'common.empty': 'No records found',
    'common.error': 'An unexpected error occurred',
    'common.close': 'Close',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
    'common.select': 'Select an option',

    'banner.staging': 'STAGING ENVIRONMENT — TEST DATA ONLY',

    'dangerousAction.title': 'Dangerous Action Confirmation',
    'dangerousAction.confirmPrompt': 'To confirm, please type {expected} below:',
    'dangerousAction.stepUpPrompt': 'Step-up authentication required to proceed.',
    'dangerousAction.reasonLabel': 'Reason for this administrative action (audited):',
    'dangerousAction.reasonPlaceholder': 'Enter mandatory audit justification...',

    'maskedField.reasonTitle': 'PHI / PII Access Justification',
    'maskedField.reasonPrompt': 'Regulatory compliance requires a logged reason to decrypt and view this sensitive field.',
    'maskedField.reasonLabel': 'Access Reason:',
    'maskedField.reasonPlaceholder': 'e.g., Patient clinical review, billing audit...',
    'maskedField.autoHideWarning': 'Value will automatically hide after 60 seconds or on window blur.',

    'copyOnceSecret.title': 'Single-Use Secret Generation',
    'copyOnceSecret.warning': 'Store this secret immediately in a secure vault. You will not be able to view it again after closing.',
    'copyOnceSecret.ackLabel': "I have safely stored this secret and understand it cannot be displayed again.",

    'table.rowsPerPage': 'Rows per page:',
    'table.pageOf': 'Page {current} of {total}',
    'table.selectedCount': '{count} of {total} row(s) selected',
    'table.noResults': 'No results match the selected filter criteria.',

    'form.submit': 'Submit',
    'form.unsavedChanges': 'You have unsaved changes. Are you sure you want to discard them?',
  },
  'hi-IN': {
    'common.save': 'सुरक्षित करें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.delete': 'हटाएं',
    'common.loading': 'लोड हो रहा है...',
    'common.search': 'खोजें...',
    'common.reveal': 'दिखाएं',
    'common.hide': 'छिपाएं',
    'common.copy': 'कॉपी करें',
    'common.copied': 'कॉपी हो गया!',
    'common.retry': 'पुनः प्रयास करें',
    'common.empty': 'कोई रिकॉर्ड नहीं मिला',
    'common.error': 'एक अप्रत्याशित त्रुटि हुई',
    'common.close': 'बंद करें',
    'common.previous': 'पिछला',
    'common.next': 'अगला',
    'common.filter': 'फ़िल्टर',
    'common.clear': 'साफ़ करें',
    'common.select': 'एक विकल्प चुनें',

    'banner.staging': 'स्टेजिंग वातावरण — केवल परीक्षण डेटा',

    'dangerousAction.title': 'खतरनाक कार्रवाई की पुष्टि',
    'dangerousAction.confirmPrompt': 'पुष्टि करने के लिए, कृपया नीचे {expected} टाइप करें:',
    'dangerousAction.stepUpPrompt': 'आगे बढ़ने के लिए प्रमाणीकरण आवश्यक है।',
    'dangerousAction.reasonLabel': 'इस प्रशासनिक कार्रवाई का कारण (ऑडिटेड):',
    'dangerousAction.reasonPlaceholder': 'अनिवार्य ऑडिट औचित्य दर्ज करें...',

    'maskedField.reasonTitle': 'संवेदनशील डेटा एक्सेस औचित्य',
    'maskedField.reasonPrompt': 'इस संवेदनशील फ़ील्ड को देखने के लिए एक लॉग किया गया कारण आवश्यक है।',
    'maskedField.reasonLabel': 'एक्सेस का कारण:',
    'maskedField.reasonPlaceholder': 'उदा., रोगी समीक्षा, बिलिंग ऑडिट...',
    'maskedField.autoHideWarning': 'मान 60 सेकंड के बाद या विंडो ब्लर होने पर स्वचालित रूप से छिप जाएगा।',

    'copyOnceSecret.title': 'एकल-उपयोग सीक्रेट निर्माण',
    'copyOnceSecret.warning': 'इस सीक्रेट को तुरंत एक सुरक्षित स्थान पर सहेजें। आप इसे फिर कभी नहीं देख पाएंगे।',
    'copyOnceSecret.ackLabel': 'मैंने इस सीक्रेट को सुरक्षित रूप से सहेज लिया है और समझता हूँ कि इसे दोबारा नहीं देखा जा सकता।',

    'table.rowsPerPage': 'प्रति पृष्ठ पंक्तियाँ:',
    'table.pageOf': 'पृष्ठ {current} का {total}',
    'table.selectedCount': '{total} में से {count} पंक्तियाँ चयनित',
    'table.noResults': 'चयनित फ़िल्टर से कोई परिणाम मेल नहीं खाता।',

    'form.submit': 'सबमिट करें',
    'form.unsavedChanges': 'आपके पास असहेजे गए बदलाव हैं। क्या आप वाकई उन्हें छोड़ना चाहते हैं?',
  },
};

let currentLocale: Locale = 'en-IN';

export function setLocale(locale: Locale): void {
  if (MESSAGES[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translates a key with optional dynamic parameter interpolation.
 * Example: t('table.pageOf', { current: 1, total: 5 }) => "Page 1 of 5"
 */
export function t(key: string, params?: Record<string, string | number>, overrideLocale?: Locale): string {
  const locale = overrideLocale || currentLocale;
  const catalog = MESSAGES[locale] || MESSAGES['en-IN'];
  let template = catalog[key] || MESSAGES['en-IN'][key] || key;

  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }

  return template;
}

