/* ==========================================================================
   store.js — local-only persistence.

   Nothing leaves the device. Data is kept in IndexedDB when the browser
   allows it, and falls back to localStorage automatically (which matters
   when the app is opened straight off the disk with file://).

   The whole database is held in memory as one object and written back as a
   single debounced blob. That keeps the code small and makes backup/restore
   a one-liner, which is the right trade at the scale this app is built for
   (an outreach team with tens to a few hundred records).

   With a passcode set (see crypto.js) the blob is encrypted before it is
   written, and the app starts locked until the passcode is entered.
   ========================================================================== */

var Store = (function () {
  'use strict';

  var DB_NAME = 'outreach-companion';
  var DB_VERSION = 1;
  var IDB_STORE = 'kv';
  var KEY = 'database';
  var LS_KEY = 'outreach-companion-db';

  var DEFAULT_DOCUMENTS = [
    'State ID or Driver’s License',
    'Social Security Card',
    'Birth Certificate',
    'Proof of Income / Benefit Letter',
    'Medical Insurance Card',
    'Housing Application'
  ];

  var db = null;          // IndexedDB handle, when available
  var backend = 'memory'; // 'idb' | 'localstorage' | 'memory'
  var data = null;        // the in-memory database (null while locked)
  var bundle = null;      // encryption key bundle, when a passcode is set
  var envelope = null;    // the encrypted blob, while locked
  var saveTimer = null;
  var pending = null;     // { promise, resolve, reject } shared by queued saves
  var listeners = [];
  var errorListeners = [];

  /* ----- schema ------------------------------------------------------- */

  function blankDatabase() {
    return {
      schema: 2,
      createdAt: new Date().toISOString(),
      settings: {
        orgName: '',
        orgContact: '',
        orgLogo: '',          // small data URL, printed on documents
        workerName: '',
        coc: '',
        theme: 'auto',
        // How many days of silence before a record is flagged as drifting.
        followUpDays: 14,
        // Minutes of inactivity before a passcode-protected app locks itself.
        lockMinutes: 10,
        // Set whenever a backup is exported, so the app can nag honestly.
        lastBackupAt: '',
        confidentialityNote:
          'CONFIDENTIAL. This document contains personal information shared in ' +
          'confidence. Share only with the written consent of the person named above.'
      },
      people: []
    };
  }

  function blankPerson() {
    var now = new Date().toISOString();
    return {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      archived: false,
      // Set only on the explorable demo caseload, so it can be badged on
      // screen and removed in one click without touching real records.
      isSample: false,

      // Identity
      photo: '',            // downscaled data URL
      photoTakenAt: '',
      firstName: '',
      lastName: '',
      preferredName: '',
      pronouns: '',
      dob: '',
      phone: '',
      email: '',
      caseNumber: '',
      languages: '',

      // Where they are in the outreach journey. The stage itself is
      // inferred from these milestones (see flow.js); the override is
      // there for when the record does not tell the whole story.
      stageOverride: '',
      engagementDate: '',   // the day they began working with you
      assessmentDate: '',   // local coordinated-entry assessment
      housedDate: '',       // move-in day
      followUpDate: '',     // next planned contact
      followUpNote: '',

      // Facts a local HMIS or coordinated entry will ask for anyway. Kept
      // so nobody has to be re-interviewed about the worst period of their
      // life because a form was not filled in. Deliberately no SSN field:
      // the number is a serious liability on a field device, so this only
      // records whether it is held somewhere official.
      hmis: {
        clientCode: '',     // the local HMIS id, if they already have one
        coc: '',            // Continuum of Care
        householdType: '',
        raceEthnicity: '',
        gender: '',
        ssnOnFile: '',
        veteranAsked: '',   // 'Yes' | 'No' | 'Does not know' | 'Prefers not to say'
        disabilityAsked: '',
        homelessMonths: '',
        homelessTimes: '',
        notes: ''
      },

      // Where they stay
      stay: {
        situation: '',
        locationName: '',
        crossStreets: '',
        city: '',
        state: '',
        zip: '',
        area: '',
        sinceDate: '',
        timeAtLocation: '',
        homelessSince: '',
        nightsOutdoors: '',
        gpsLat: '',
        gpsLng: '',
        gpsAt: '',
        bestTimeToFind: '',
        withPartner: false,
        withChildren: false,
        childrenCount: '',
        withPets: false,
        petDetails: '',
        safetyNotes: '',
        stayNotes: ''
      },

      // What they are trying to accomplish
      goals: [],            // {id,title,category,why,steps,status,targetDate,support,notes,createdAt,updatedAt}

      // My Story — in their own words
      story: {
        quote: '',
        text: '',
        strengths: '',
        hopes: '',
        recordedBy: '',
        recordedAt: '',
        toldInOwnWords: true,
        consentToShare: false
      },

      // Needs, barriers, supports
      needs: [],
      barriers: [],
      benefits: [],
      healthNotes: '',
      insurance: '',
      veteran: false,
      disability: false,

      // Paperwork they hold or need
      documents: [],        // {id,name,status,notes,expires}

      // Contact history & referrals
      log: [],              // {id,date,type,worker,notes}
      referrals: [],        // {id,org,service,date,status,contact,notes}

      consent: {
        dataConsent: false,
        photoConsent: false,
        storyConsent: false,
        signedName: '',
        signedDate: ''
      },

      tags: [],
      generalNotes: ''
    };
  }

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  /* ----- migration and sanitising ---------------------------------------
     Fills in anything a record is missing so older or partial data never
     breaks a screen, and coerces every value to the type the screens
     expect. Runs on load and on import — an imported backup may have been
     edited by hand, damaged in transit, or written by someone hostile.
     ------------------------------------------------------------------- */

  var NESTED = ['stay', 'story', 'consent', 'hmis'];
  var ROW_LISTS = ['goals', 'documents', 'log', 'referrals'];
  var STRING_LISTS = ['needs', 'barriers', 'benefits', 'tags'];

  // Keep a value only if it has the same basic type as the blank default.
  function coerce(def, v) {
    if (typeof def === 'boolean') return v === true || v === 'true';
    if (typeof def === 'number') { var n = Number(v); return isNaN(n) ? def : n; }
    if (typeof def === 'string') return (typeof v === 'string' || typeof v === 'number') ? String(v) : def;
    return def;
  }

  function cleanRow(row) {
    var out = {};
    Object.keys(row).forEach(function (k) {
      var v = row[k];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
    });
    out.id = Util.safeId(row.id) ? row.id : uid();
    return out;
  }

  function normalize(loaded) {
    var base = blankDatabase();
    if (!loaded || typeof loaded !== 'object') return base;

    var out = base;
    out.createdAt = typeof loaded.createdAt === 'string' ? loaded.createdAt : base.createdAt;
    if (loaded.settings && typeof loaded.settings === 'object') {
      for (var k in base.settings) {
        if (Object.prototype.hasOwnProperty.call(loaded.settings, k) &&
            loaded.settings[k] !== undefined && loaded.settings[k] !== null) {
          out.settings[k] = coerce(base.settings[k], loaded.settings[k]);
        }
      }
    }
    out.settings.orgLogo = Util.safeImage(out.settings.orgLogo);
    if (['auto', 'light', 'dark'].indexOf(out.settings.theme) === -1) out.settings.theme = 'auto';

    var seen = {};
    out.people = (Array.isArray(loaded.people) ? loaded.people : [])
      .filter(function (p) { return p && typeof p === 'object'; })
      .map(normalizePerson)
      .filter(function (p) {          // a backup with the same id twice keeps the first
        if (seen[p.id]) return false;
        seen[p.id] = true;
        return true;
      });
    return out;
  }

  function normalizePerson(p) {
    var base = blankPerson();
    if (!p || typeof p !== 'object') return base;
    var freshId = base.id;

    Object.keys(base).forEach(function (k) {
      var v = p[k];
      if (v === undefined || v === null) return;
      if (NESTED.indexOf(k) !== -1) {
        if (typeof v !== 'object') return;
        Object.keys(base[k]).forEach(function (sk) {
          if (v[sk] !== undefined && v[sk] !== null) base[k][sk] = coerce(base[k][sk], v[sk]);
        });
      } else if (ROW_LISTS.indexOf(k) !== -1) {
        base[k] = Array.isArray(v)
          ? v.filter(function (r) { return r && typeof r === 'object'; }).map(cleanRow)
          : [];
      } else if (STRING_LISTS.indexOf(k) !== -1) {
        base[k] = Array.isArray(v)
          ? v.filter(function (s) { return typeof s === 'string'; })
          : [];
      } else {
        base[k] = coerce(base[k], v);
      }
    });

    base.id = Util.safeId(p.id) ? p.id : freshId;
    base.photo = Util.safeImage(base.photo);
    return base;
  }

  /* ----- backends ----------------------------------------------------- */

  function openIDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no indexedDB'));
      var req;
      try {
        req = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        return reject(e);
      }
      // Some browsers never fire an event for a blocked file:// origin.
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('indexedDB timeout')); }
      }, 2500);

      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve(req.result);
      };
      req.onerror = function () {
        if (settled) return;
        settled = true; clearTimeout(timer); reject(req.error || new Error('indexedDB error'));
      };
    });
  }

  function idbGet(key) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readonly');
      var req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbPut(key, value) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('aborted')); };
    });
  }

  function readLocal() {
    try {
      var raw = window.localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(payload) {
    return new Promise(function (resolve, reject) {
      try {
        window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
        resolve();
      } catch (e) {
        backend = 'memory';
        reject(new Error(
          'This browser ran out of local storage space. Your work is still on ' +
          'screen but was not saved. Use Settings to back up now, then remove ' +
          'some photos.'
        ));
      }
    });
  }

  /* ----- load ----------------------------------------------------------- */

  // Resolves with { locked: boolean }.
  function init() {
    return openIDB()
      .then(function (handle) {
        db = handle;
        backend = 'idb';
        return idbGet(KEY);
      })
      .catch(function () {
        backend = 'localstorage';
        try {
          window.localStorage.getItem(LS_KEY);
        } catch (e) {
          backend = 'memory';
        }
        return null;
      })
      .then(function (loaded) {
        // A copy left in localStorage by an earlier session (or by the
        // file:// fallback) — take it if IndexedDB has nothing.
        if (!loaded) loaded = readLocal();
        return accept(loaded);
      })
      .catch(function () {
        backend = 'memory';
        data = blankDatabase();
        return { locked: false };
      });
  }

  function accept(loaded) {
    if (Crypt.isEnvelope(loaded)) {
      envelope = loaded;
      data = null;
      return { locked: true };
    }
    data = normalize(loaded);
    return { locked: false };
  }

  /* ----- save ----------------------------------------------------------- */

  function payload() {
    return bundle ? Crypt.seal(bundle, data) : Promise.resolve(data);
  }

  function persist() {
    if (!data) return Promise.resolve();  // locked: nothing in memory to write
    return payload().then(function (body) {
      if (backend === 'idb') {
        return idbPut(KEY, body).then(function () {
          // Never leave an older (possibly unencrypted) copy behind.
          try { window.localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
        }, function () {
          // IndexedDB went away mid-session (private mode, quota). Downgrade.
          backend = 'localstorage';
          return writeLocal(body);
        });
      }
      if (backend === 'localstorage') return writeLocal(body);
      return undefined;
    });
  }

  function settle(err) {
    var p = pending;
    pending = null;
    if (!p) return;
    if (err) {
      errorListeners.forEach(function (fn) { try { fn(err); } catch (e) { /* ignore */ } });
      p.reject(err);
    } else {
      listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
      p.resolve();
    }
  }

  // Debounced so typing in a textarea does not write on every keystroke.
  // Every call made inside one debounce window shares the same promise, and
  // a failure is always reported through onError even if nobody is waiting.
  function ensurePending() {
    if (!pending) {
      var p = {};
      p.promise = new Promise(function (res, rej) { p.resolve = res; p.reject = rej; });
      p.promise.catch(function () { /* reported through onError */ });
      pending = p;
    }
    return pending.promise;
  }

  function save() {
    var mine = ensurePending();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      persist().then(function () { settle(); }, settle);
    }, 250);
    return mine;
  }

  // Write now, including anything waiting in the debounce window. Used on
  // page hide, so closing the tab straight after typing loses nothing.
  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    ensurePending();
    return persist().then(function () { settle(); }, function (err) { settle(err); throw err; });
  }

  function flush() {
    return saveTimer ? saveNow() : Promise.resolve();
  }

  /* ----- passcode ------------------------------------------------------- */

  function unlock(passcode) {
    if (!envelope) return Promise.resolve();
    return Crypt.open(envelope, passcode).then(function (res) {
      bundle = res.bundle;
      data = normalize(res.data);
      envelope = null;
    });
  }

  // Writes the encrypted copy, then forgets everything in memory.
  function lock() {
    if (!bundle || !data) return Promise.resolve();
    return flush().then(function () { return Crypt.seal(bundle, data); }).then(function (env) {
      envelope = env;
      data = null;
      bundle = null;
    });
  }

  function setPasscode(passcode) {
    return Crypt.newKey(passcode).then(function (b) {
      bundle = b;
      return saveNow();
    });
  }

  function removePasscode() {
    bundle = null;
    return saveNow();
  }

  /* ----- public API --------------------------------------------------- */

  var api = {
    init: init,
    save: save,
    saveNow: saveNow,
    flush: flush,
    onSave: function (fn) { listeners.push(fn); },
    onError: function (fn) { errorListeners.push(fn); },
    backend: function () { return backend; },

    isLocked: function () { return !data; },
    hasPasscode: function () { return !!bundle || !!envelope; },
    unlock: unlock,
    lock: lock,
    setPasscode: setPasscode,
    removePasscode: removePasscode,

    // What goes into a backup file: encrypted when a passcode is set.
    backupPayload: function () { return payload(); },

    all: function () { return data.people; },
    settings: function () { return data.settings; },
    raw: function () { return data; },

    get: function (id) {
      return data.people.filter(function (p) { return p.id === id; })[0] || null;
    },

    create: function () {
      var p = blankPerson();
      p.documents = defaultDocuments();
      data.people.unshift(p);
      save();
      return p;
    },

    remove: function (id) {
      data.people = data.people.filter(function (p) { return p.id !== id; });
      return save();
    },

    touch: function (p) {
      p.updatedAt = new Date().toISOString();
      return save();
    },

    replaceAll: function (loaded) {
      data = normalize(loaded);
      return saveNow();
    },

    mergeIn: function (loaded) {
      var incoming = normalize(loaded);
      var added = 0, updated = 0;
      incoming.people.forEach(function (p) {
        var existing = api.get(p.id);
        if (existing) {
          // Last edit wins, so a stale backup cannot clobber newer field notes.
          if (new Date(p.updatedAt) > new Date(existing.updatedAt)) {
            data.people = data.people.map(function (x) { return x.id === p.id ? p : x; });
            updated++;
          }
        } else {
          data.people.push(p);
          added++;
        }
      });
      return saveNow().then(function () { return { added: added, updated: updated }; });
    },

    // Bulk-add, used by the sample caseload. One write, not six.
    addMany: function (list) {
      list.forEach(function (p) { data.people.unshift(normalizePerson(p)); });
      return saveNow();
    },

    removeSamples: function () {
      var before = data.people.length;
      data.people = data.people.filter(function (p) { return !p.isSample; });
      return saveNow().then(function () { return before - data.people.length; });
    },

    hasSamples: function () {
      return data.people.some(function (p) { return p.isSample; });
    },

    uid: uid,
    blankPerson: blankPerson,
    blankDatabase: blankDatabase,
    normalize: normalize,
    DEFAULT_DOCUMENTS: DEFAULT_DOCUMENTS
  };
  return api;

  function defaultDocuments() {
    return DEFAULT_DOCUMENTS.map(function (name) {
      return { id: uid(), name: name, status: 'unknown', notes: '', expires: '' };
    });
  }
})();
