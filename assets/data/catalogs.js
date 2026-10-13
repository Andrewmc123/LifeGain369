/* ==========================================================================
   catalogs.js — the option lists behind every dropdown and chip group.

   Plain data, kept apart from the screens so a team can adapt the wording
   to their own city or programme without reading any rendering code.
   ========================================================================== */

var CATALOG = {
  SITUATIONS: [
    'Unsheltered — street/sidewalk', 'Tent or encampment', 'Vehicle (car, van, RV)',
    'Abandoned building', 'Emergency shelter', 'Transitional housing',
    'Motel or hotel', 'Couch surfing / staying with others', 'Institution (hospital, jail)',
    'Recently housed', 'Other'
  ],

  NEEDS: [
    'Food', 'Water', 'Clothing', 'Blankets / sleeping bag', 'Tent', 'Hygiene supplies',
    'Shower', 'Laundry', 'Shelter bed', 'Housing', 'Medical care', 'Mental health support',
    'Substance use support', 'Dental care', 'Eyeglasses', 'Phone', 'Transportation',
    'ID documents', 'Job / income', 'Legal help', 'Mailing address', 'Storage',
    'Pet food / vet care', 'Warming or cooling center'
  ],

  BARRIERS: [
    'No ID', 'No income', 'Eviction history', 'Criminal record', 'Poor credit',
    'No phone', 'No transportation', 'Physical health condition', 'Disability',
    'Mental health', 'Substance use', 'Language barrier', 'Reading / paperwork',
    'Fleeing domestic violence', 'Has a pet', 'Wants to stay with partner',
    'Feels unsafe in shelters', 'Lost documents', 'No support network', 'Long waitlists'
  ],

  BENEFITS: [
    'SNAP / food stamps', 'Medicaid', 'Medicare', 'SSI', 'SSDI', 'VA benefits',
    'TANF', 'General assistance', 'Unemployment', 'Housing voucher', 'Veterans housing (HUD-VASH)'
  ],

  GOAL_CATEGORIES: [
    'Housing', 'Income & work', 'Physical health', 'Mental health', 'Recovery',
    'Documents & ID', 'Benefits', 'Family & reunification', 'Education',
    'Transportation', 'Legal', 'Pet care', 'Personal'
  ],

  GOAL_STATUS: ['Just started', 'In progress', 'Waiting on someone else', 'Stuck — needs help', 'Achieved', 'Paused'],

  LOG_TYPES: ['Street outreach', 'Phone call', 'Office visit', 'Shelter visit', 'Appointment',
    'Transportation', 'Follow-up', 'Wellness check', 'Other'],

  REFERRAL_STATUS: ['Referred', 'Appointment set', 'Attended', 'Enrolled', 'Waitlisted', 'Declined', 'No longer needed'],

  DOC_STATUS: [
    { v: 'unknown', t: 'Unknown' }, { v: 'have', t: 'Has it' }, { v: 'need', t: 'Needs it' },
    { v: 'applied', t: 'Applied for' }, { v: 'lost', t: 'Lost / stolen' }
  ],

  // The answer to an intake question that may be "no" — a "no" is still an
  // answer, and the record should be able to say so.
  ASKED: ['Yes', 'No', 'Does not know', 'Prefers not to say'],

  SSN_ON_FILE: ['Yes - on file with an agency', 'No', 'They do not know', 'Prefer not to say'],

  PERSON_TABS: [
    { k: 'overview', t: 'Overview' },
    { k: 'plan',     t: 'Plan & next steps' },
    { k: 'stay',     t: 'Where they stay' },
    { k: 'goals',    t: 'Goals' },
    { k: 'story',    t: 'My Story' },
    { k: 'needs',    t: 'Needs & documents' },
    { k: 'log',      t: 'History' },
    { k: 'doc',      t: 'Documentation' }
  ]
};
