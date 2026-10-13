/* ==========================================================================
   config.js — the settings that belong to whoever publishes this app,
   not to the worker using it.

   Edit this one file to put your own name, contact details and plans on
   the app. Leave a value blank ('') and the button that uses it is simply
   not shown — nothing breaks.
   ========================================================================== */

var APP_CONFIG = {
  productName: 'LifeGain369',
  version: '2.0.0',

  // Where an organisation reaches you about the paid plans. A mailto link is
  // built from this address.
  contactEmail: '',

  // A payment or donation page (Stripe Payment Link, Open Collective,
  // GitHub Sponsors, Ko-fi…). Opens in a new tab. Never receives any record.
  supportUrl: '',

  // Shown on Help → Plans & support. Prices are yours to set. The core app
  // stays free on purpose: a worker should never lose access to a record
  // because a subscription lapsed.
  plans: [
    {
      name: 'Free',
      price: '$0',
      cadence: 'forever',
      blurb: 'For an individual outreach worker.',
      features: [
        'Every screen in the app, unlimited records',
        'Print, PDF, email and file exports',
        'Passcode lock and encrypted backups',
        'Works offline, installs to a phone'
      ]
    },
    {
      name: 'Team',
      price: '$29',
      cadence: 'per month, per organisation',
      blurb: 'For an outreach team that reports to funders.',
      highlight: true,
      features: [
        'We set it up with your logo, wording and contacts',
        'Hosted for your team on your own web address',
        'Funder report set up for your contract',
        'Onboarding call and priority email support'
      ]
    },
    {
      name: 'Partner',
      price: 'Contact us',
      cadence: '',
      blurb: 'For a city, Continuum of Care or large provider.',
      features: [
        'A resource pack written for your city',
        'Training for staff and volunteers',
        'Custom fields and report layouts',
        'Data-protection review support'
      ]
    }
  ]
};
