/* ==========================================================================
   storage.js — local-only persistence.

   Nothing leaves the device. Data is kept in IndexedDB when the browser
   allows it, and falls back to localStorage automatically (which matters
   when the app is opened straight off the disk with file://).

   The whole database is held in memory as one object and written back as a
   single debounced blob. That keeps the code small and makes backup/restore
   a one-liner, which is the right trade at the scale this app is built for
   (an outreach team with tens to a few hundred records).
   ========================================================================== */

var Store = (function () {
  'use strict';

  var DB_NAME = 'outreach-companion';
  var DB_VERSION = 1;
  var IDB_STORE = 'kv';
  var KEY = 'database';
  var LS_KEY = 'outreach-companion-db';

  var db = null;          // IndexedDB handle, when available
  var backend = 'memory'; // 'idb' | 'localstorage' | 'memory'
  var data = null;        // the in-memory database
  var saveTimer = null;
  var listeners = [];

  /* ----- schema ------------------------------------------------------- */

  function blankDatabase() {
    return {
      schema: 1,
      createdAt: new Date().toISOString(),
      settings: {
        orgName: '',
        orgContact: '',
        workerName: '',
        theme: 'auto',
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

  /* ----- migration ---------------------------------------------------- */

  // Fills in anything a record is missing so older or partial data never
  // breaks a screen. Runs on load and on import.
  function normalize(loaded) {
    var base = blankDatabase();
    if (!loaded || typeof loaded !== 'object') return base;

    var out = base;
    out.createdAt = loaded.createdAt || base.createdAt;
    if (loaded.settings) {
      for (var k in base.settings) {
        if (Object.prototype.hasOwnProperty.call(loaded.settings, k) &&
            loaded.settings[k] !== undefined && loaded.settings[k] !== null) {
          out.settings[k] = loaded.settings[k];
        }
      }
    }
    out.people = (loaded.people || []).map(normalizePerson);
    return out;
  }

  function normalizePerson(p) {
    var base = blankPerson();
    if (!p || typeof p !== 'object') return base;

    Object.keys(base).forEach(function (k) {
      var v = p[k];
      if (v === undefined || v === null) return;
      if (k === 'stay' || k === 'story' || k === 'consent') {
        Object.keys(base[k]).forEach(function (sk) {
          if (v[sk] !== undefined && v[sk] !== null) base[k][sk] = v[sk];
        });
      } else if (Array.isArray(base[k])) {
        base[k] = Array.isArray(v) ? v.slice() : base[k];
      } else {
        base[k] = v;
      }
    });

    base.id = p.id || base.id;
    // Repeating rows need stable ids for editing.
    ['goals', 'documents', 'log', 'referrals'].forEach(function (list) {
      base[list] = base[list].map(function (row) {
        if (row && !row.id) row.id = uid();
        return row;
      });
    });
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

  /* ----- public API --------------------------------------------------- */

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
          var raw = window.localStorage.getItem(LS_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          backend = 'memory';
          return null;
        }
      })
      .then(function (loaded) {
        // A record written under IndexedDB on a previous run, or a
        // localStorage copy left by an earlier session — take whichever exists.
        if (!loaded && backend === 'idb') {
          try {
            var raw = window.localStorage.getItem(LS_KEY);
            if (raw) loaded = JSON.parse(raw);
          } catch (e) { /* ignore */ }
        }
        data = normalize(loaded);
        return data;
      })
      .catch(function () {
        backend = 'memory';
        data = blankDatabase();
        return data;
      });
  }

  function persist() {
    var payload = JSON.stringify(data);
    if (backend === 'idb') {
      return idbPut(KEY, data).catch(function () {
        // IndexedDB went away mid-session (private mode, quota). Downgrade.
        backend = 'localstorage';
        return writeLocal(payload);
      });
    }
    if (backend === 'localstorage') return writeLocal(payload);
    return Promise.resolve();
  }

  function writeLocal(payload) {
    return new Promise(function (resolve, reject) {
      try {
        window.localStorage.setItem(LS_KEY, payload);
        resolve();
      } catch (e) {
        backend = 'memory';
        reject(new Error(
          'This browser ran out of local storage space. Your work is still on ' +
          'screen but was not saved. Use Settings to back up now, then remove ' +
          'or archive some photos.'
        ));
      }
    });
  }

  // Debounced so typing in a textarea does not write on every keystroke.
  function save() {
    return new Promise(function (resolve, reject) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        saveTimer = null;
        persist().then(function () {
          listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
          resolve();
        }, reject);
      }, 250);
    });
  }

  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    return persist();
  }

  return {
    init: init,
    save: save,
    saveNow: saveNow,
    onSave: function (fn) { listeners.push(fn); },
    backend: function () { return backend; },

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
      var byId = {};
      data.people.forEach(function (p) { byId[p.id] = true; });
      var added = 0, updated = 0;
      incoming.people.forEach(function (p) {
        if (byId[p.id]) {
          var existing = Store.get(p.id);
          // Last edit wins, so a stale backup cannot clobber newer field notes.
          if (existing && new Date(p.updatedAt) > new Date(existing.updatedAt)) {
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

    uid: uid,
    blankPerson: blankPerson,
    blankDatabase: blankDatabase
  };

  function defaultDocuments() {
    return [
      'State ID or Driver’s License',
      'Social Security Card',
      'Birth Certificate',
      'Proof of Income / Benefit Letter',
      'Medical Insurance Card',
      'Housing Application'
    ].map(function (name) {
      return { id: uid(), name: name, status: 'unknown', notes: '', expires: '' };
    });
  }
})();
