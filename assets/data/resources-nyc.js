/* ==========================================================================
   resources-nyc.js — the New York City resource pack.

   Kept as data, in its own file, for three reasons:

   1. Phone numbers and intake addresses go stale, and a worker sending
      someone across the city to a closed door is a real harm. Everything
      here carries a "checked" date, and anything the sources disagreed on
      is marked `verify: true` and says so on screen rather than pretending
      to be certain.

   2. Another city can be supported by writing another file of the same
      shape. Nothing in the app is New York specific except this pack.

   3. It can be printed as a street sheet and handed to someone. That is
      often worth more than anything stored in the app.

   Checked against NYC.gov / DHS, Legal Aid NYC, Coalition for the
   Homeless, DYCD and the Veterans Crisis Line on the date below.

   IMPORTANT — 2026 intake relocation: the 30th Street Intake Center at
   400 East 30th Street has closed and moved. Sources disagree on whether
   the switch took effect on 1 May or 1 August 2026, so both new addresses
   are marked for verification. Ring before sending anyone.
   ========================================================================== */

var RESOURCE_PACK = {
  region: 'New York City',
  checked: '2026-08-19',

  caution:
    'Numbers and addresses change, and shelter intake in particular moved during 2026. ' +
    'Ring ahead before sending someone across the city. Anything marked "check first" is ' +
    'something the sources did not agree on.',

  /* ----------------------------------------------------------------
     Groups are ordered by urgency: what you need at 2am comes first.
     ---------------------------------------------------------------- */
  groups: [
    {
      id: 'now',
      title: 'Right now',
      intro: 'If someone is in danger, cold, or in crisis. All of these answer 24 hours.',
      items: [
        { name: 'Emergency', phone: '911',
          what: 'Immediate danger, a medical emergency, or someone unresponsive. In severe cold or heat, this is the right call and not an overreaction.' },
        { name: '988 Suicide & Crisis Lifeline', phone: '988',
          web: 'https://nyc988.cityofnewyork.us',
          what: 'Suicidal thoughts, mental health or substance crisis. Also the way to reach a Mobile Crisis Team in NYC. Text 988 works too.' },
        { name: 'Veterans Crisis Line', phone: '988',
          phoneNote: 'dial 988, then press 1',
          web: 'https://www.veteranscrisisline.net',
          what: 'For veterans, service members, Guard and Reserve. No VA enrolment needed.' },
        { name: 'NYC 311 — street outreach', phone: '311',
          phoneNote: 'ask for "street outreach"',
          web: 'https://portal.311.nyc.gov',
          what: 'Sends a DHS outreach team to someone sleeping rough. The city aims to reach them within about an hour. Outside NYC dial 212-639-9675.' },
        { name: 'Coalition for the Homeless — Crisis Hotline', phone: '1-888-358-2384',
          web: 'https://www.coalitionforthehomeless.org',
          what: 'Immediate shelter need, or someone turned away from shelter. Call this when intake refuses a person — that refusal is often reversible.' },
        { name: 'Safe Horizon — Domestic Violence Hotline', phone: '800-621-4673',
          what: 'Fleeing violence at home. A DV survivor can enter shelter through a separate route and should not be sent to general intake.' },
        { name: 'BRC Homeless Services Hotline', phone: '212-533-5151',
          what: 'Bowery Residents’ Committee. Outreach, drop-in and shelter placement.' }
      ]
    },

    {
      id: 'bed',
      title: 'A bed tonight',
      intro:
        'NYC has a right to shelter: nobody should be turned away for having no ID, no money, ' +
        'or no documents. Intake for single adults runs 24 hours, every day of the year.',
      items: [
        { name: 'Single adult men — intake',
          address: '8 East 3rd Street, Manhattan',
          verify: true,
          what: 'Replaced the old 30th Street centre in 2026 and has beds on site. Not fully step-free — the main entrance has stairs, so ring ahead for anyone with a mobility disability.' },
        { name: 'Single adult women — intake',
          address: 'HELP Women’s Center, Brooklyn',
          phone: '718-483-7700',
          verify: true,
          what: 'Sources give the address as either 116 Williams Avenue or 114 Snediker Avenue, Brooklyn 11207 — these sit on the same site. Fully accessible. C train to Liberty Avenue.' },
        { name: 'Single adult women — intake (Bronx)',
          address: 'Franklin Avenue Women’s Shelter, 1122 Franklin Avenue, Bronx 10456',
          phone: '929-281-2330',
          what: 'The second intake point for single women.' },
        { name: 'Adult families — intake',
          address: '333 Bowery, Manhattan',
          verify: true,
          what: 'Couples and adult families with no minor children. Nobody sleeps here; people are placed elsewhere after assessment. Round the corner from the men’s intake.' },
        { name: 'Families with children — PATH',
          address: '151 East 151st Street, Bronx',
          what: 'Prevention Assistance and Temporary Housing. The only intake for families with a child under 21, and for pregnant women. Open 24 hours.' },
        { name: 'Drop-in centres', phone: '877-437-6746',
          phoneNote: '877-4-DROP-IN',
          what: 'Somewhere warm, a meal, a shower, laundry and a caseworker without entering the shelter system. Often the first thing someone will accept.' },
        { name: 'Safe Haven & stabilisation beds', phone: '311',
          what: 'Low-threshold beds for people who have refused traditional shelter. Fewer rules, smaller sites. Ask an outreach team — these are not walk-in.' }
      ]
    },

    {
      id: 'youth',
      title: 'Young people under 25',
      intro: 'Never send a young person to adult intake if a youth route exists. Different system, different rules.',
      items: [
        { name: 'Covenant House Crisis Shelter',
          address: '460 West 41st Street, Manhattan',
          phone: '212-613-0300',
          what: 'Open 24/7. No referral needed. Walk in.' },
        { name: 'Ali Forney Center', phone: '212-222-3427',
          what: 'LGBTQ young people. Manhattan drop-in at 321 West 125th Street, 212-206-0574.' },
        { name: 'DYCD Youth Connect', phone: '800-246-4646',
          web: 'https://www.nyc.gov/site/dycd/services/runaway-homeless-youth/crisis-services-programs.page',
          what: 'City runaway and homeless youth services, ages 14 to 24. Crisis beds for up to 120 days.' }
      ]
    },

    {
      id: 'money',
      title: 'Money, food and health',
      intro: 'Benefits are the slow work that makes housing possible. Start them early.',
      items: [
        { name: 'ACCESS HRA', web: 'https://a069-access.nyc.gov/accesshra',
          what: 'Apply for Cash Assistance, SNAP, Medicaid and Fair Fares, upload documents and renew CityFHEPS. Works on a phone.' },
        { name: 'SNAP / food stamps', phone: '718-557-1399',
          what: 'Someone with no fixed address can still claim SNAP, and may qualify as a one-person household immediately.' },
        { name: 'Food & Hunger Hotline', phone: '866-888-8777',
          what: 'Nearest pantry or soup kitchen, today.' },
        { name: 'Social Security Administration', phone: '800-772-1213',
          what: 'Replacement Social Security card, SSI and SSDI claims.' },
        { name: 'NYC Health + Hospitals', phone: '311',
          what: 'Care regardless of immigration status or ability to pay. NYC Care covers those who cannot get insurance.' },
        { name: 'GMHC', phone: '800-243-7692',
          what: 'HIV services, testing and support.' },
        { name: 'Alcoholics Anonymous / Narcotics Anonymous',
          phone: '212-647-1680',
          phoneNote: 'AA — NA is 212-929-6262',
          what: 'Meeting lists across the five boroughs.' }
      ]
    },

    {
      id: 'housing',
      title: 'Keeping or finding housing',
      intro: 'Preventing an eviction is far cheaper, and far kinder, than rehousing afterwards.',
      items: [
        { name: 'Homebase', phone: '311',
          web: 'https://www.nyc.gov/homebase',
          what: 'Eviction prevention, arrears help, mediation with a landlord. The single most useful referral for someone not yet on the street.' },
        { name: 'Eviction Prevention Hotline', phone: '1-888-850-2712',
          what: 'Facing a court date or a marshal’s notice.' },
        { name: 'Legal Aid Society', phone: '212-577-3300',
          web: 'https://legalaidnyc.org',
          what: 'Free housing lawyers. NYC tenants facing eviction have a right to counsel — most people do not know this.' },
        { name: 'CityFHEPS rental voucher',
          web: 'https://www.nyc.gov/site/hra/help/cityfheps.page',
          what: 'Pays rent above 30% of household income for up to five years, and moves anywhere in New York State. Apply through an HRA Benefits Access Center or Homebase.' },
        { name: 'NYCHA — public housing & Section 8', phone: '718-707-7771',
          what: 'Long waits, so apply early rather than when it is needed.' }
      ]
    },

    {
      id: 'depts',
      title: 'City departments',
      intro: 'Who is responsible for what, when a referral needs escalating.',
      items: [
        { name: 'Department of Homeless Services (DHS)',
          web: 'https://www.nyc.gov/site/dhs',
          what: 'Shelter, street outreach, drop-in centres.' },
        { name: 'Human Resources Administration (HRA)',
          web: 'https://www.nyc.gov/site/hra',
          what: 'Cash Assistance, SNAP, Medicaid, CityFHEPS, HIV/AIDS Services (HASA).' },
        { name: 'ACCESS NYC', web: 'https://access.nyc.gov',
          what: 'Screens for every city, state and federal benefit at once. Good for finding things nobody thought to ask about.' },
        { name: 'Department of Youth & Community Development (DYCD)',
          web: 'https://www.nyc.gov/site/dycd',
          what: 'Runaway and homeless youth services.' },
        { name: 'IDNYC', web: 'https://www.nyc.gov/site/idnyc',
          what: 'Free photo ID for anyone 10 or older, whatever their immigration status, and available with no fixed address.' },
        { name: 'Coalition for the Homeless', phone: '212-776-2000',
          web: 'https://www.coalitionforthehomeless.org',
          what: 'Independent of the city. Advocacy, food vans, crisis help, and the people to call when the system says no.' }
      ]
    },

    {
      id: 'other',
      title: 'Other lines worth having',
      intro: '',
      items: [
        { name: 'Safe Horizon — Rape & Sexual Assault', phone: '212-227-3000', what: '24 hours.' },
        { name: 'Safe Horizon — Crime Victims', phone: '212-577-7777', what: '24 hours.' },
        { name: 'NY State Child Abuse Hotline', phone: '800-342-3720',
          what: 'Mandatory reporting. Know your organisation’s policy before you ring.' },
        { name: 'National Call Center for Homeless Veterans', phone: '877-424-3838',
          phoneNote: '877-4AID-VET',
          what: 'VA housing and services for veterans.' },
        { name: 'Poison Control', phone: '800-222-1222', what: '24 hours.' },
        { name: 'Immigration Hotline', phone: '212-419-3737',
          what: 'Free, confidential immigration advice. Using shelter or benefits for a child does not affect most immigration cases, but check rather than guess.' }
      ]
    }
  ],

  /* ----------------------------------------------------------------
     What paperwork each step actually needs.

     Ordered the way the work happens: shelter first (which needs
     nothing), then the ID that unlocks everything else.
     ---------------------------------------------------------------- */
  documents: [
    {
      id: 'shelter',
      title: 'To ask for shelter',
      lede: 'Nothing. Bring what you have.',
      good: true,
      need: [
        'No ID, money or paperwork is required to request shelter in New York City.',
        'Anything they do hold — an old ID, a benefit letter, discharge papers — makes placement faster, but the absence of it is not a barrier.'
      ],
      tip:
        'If someone is turned away for lack of documents, ring the Coalition for the Homeless ' +
        'crisis line on 1-888-358-2384. Refusals at intake are often reversed.'
    },
    {
      id: 'idnyc',
      title: 'IDNYC card',
      lede: 'Free photo ID, no immigration status needed, no fixed address needed.',
      need: [
        'Proof of identity and proof of NYC residency, scored on a points system.',
        'For someone with no address, a letter from a shelter, drop-in centre or outreach organisation on headed paper can serve as proof of residency.',
        'Expired documents are often still accepted for identity.'
      ],
      tip:
        'Usually the first ID to go for: free, quickest to obtain, and accepted for SNAP, ' +
        'Cash Assistance and Section 8 applications.'
    },
    {
      id: 'ssn',
      title: 'Replacement Social Security card',
      lede: 'Needed for work, benefits and most housing applications.',
      need: [
        'Proof of identity — a driving licence, state ID or passport.',
        'Proof of US citizenship or immigration status, if not already on record.',
        'No fee. Applications can be made at a Social Security office; some can be started online.'
      ],
      tip: 'Call 800-772-1213 first — an appointment saves a wasted trip and a whole day of queueing.'
    },
    {
      id: 'birth',
      title: 'Birth certificate',
      lede: 'The document most often missing, and the one that unlocks the others.',
      need: [
        'Photo ID, or two pieces of alternative proof if none exists.',
        'Place and date of birth, and parents’ full names including mother’s maiden name.',
        'A fee, which fee waivers may cover for people in shelter.'
      ],
      tip:
        'Born outside New York? Apply to that state’s vital records office — this takes weeks, ' +
        'so start it before anything depends on it.'
    },
    {
      id: 'stateid',
      title: 'New York State ID card',
      lede: 'Accepted everywhere. Slower and stricter than IDNYC.',
      need: [
        'Six points of proof of identity — birth certificate, Social Security card, and others.',
        'Proof of a New York address; a shelter address is acceptable.',
        'A fee, reduced for those receiving public assistance.'
      ],
      tip: 'Get the IDNYC first. It buys time while the state ID is assembled.'
    },
    {
      id: 'hra',
      title: 'Cash Assistance, SNAP or Medicaid (HRA)',
      lede: 'Apply through ACCESS HRA, on a phone if necessary.',
      need: [
        'Identity — driving licence, passport, IDNYC or naturalisation certificate.',
        'Where they live — a lease, rent receipt, or a letter confirming shelter or street homelessness.',
        'Income — the last 30 days of pay slips, an award letter, or a sworn statement of no income.',
        'Resources — recent statements for any bank account in their name.'
      ],
      tip:
        'Missing documents delay a claim but do not prevent one being filed. File first, supply the ' +
        'rest afterwards — the application date is what sets when money starts.'
    },
    {
      id: 'cityfheps',
      title: 'CityFHEPS rental voucher',
      lede: 'Pays rent above 30% of income, for up to five years.',
      need: [
        'Proof of homelessness or of an eviction in progress.',
        'Identity and income documents for every member of the household.',
        'Verification of the shelter stay, where applicable.'
      ],
      tip:
        'Apply through an HRA Benefits Access Center or Homebase. Someone already receiving Cash ' +
        'Assistance can file a special grant request in the ACCESS HRA app.'
    },
    {
      id: 'va',
      title: 'Veterans’ services',
      lede: 'A discharge that was not honourable does not automatically disqualify anyone.',
      need: [
        'DD-214 discharge papers — the VA can retrieve a lost copy.',
        'Photo ID and Social Security number.'
      ],
      tip:
        'Ring 877-424-3838 (877-4AID-VET). Veterans are frequently eligible for housing help that ' +
        'nobody has ever told them about.'
    }
  ]
};
