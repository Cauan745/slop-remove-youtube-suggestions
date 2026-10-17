const prefix = 'rys_settings_';
const delimiter1 = ':';
const delimiter2 = ',';

const SETTINGS_MENU = document.getElementById('settings-menu');
const SETTINGS_BUTTON = document.getElementById('header-settings');
hydrateDropdown(SETTINGS_BUTTON, SETTINGS_MENU,
  x => x.classList.remove('hidden'),
  x => x.classList.add('hidden')
);

const POWER_ICON = qs('#power-icon');
const POWER_OPTIONS_MENU = qs('#power-options');
const POWER_OPTIONS = qsa('#power-options > div');
hydrateDropdown(POWER_ICON, POWER_OPTIONS_MENU);
POWER_OPTIONS.forEach(option => {
  const minutes = option.getAttribute('minutes');
  if (!minutes) return;

  option.addEventListener('click', () => {
    const enabled = HTML.getAttribute('global_enable') === 'true';
    updateSetting('global_enable', !enabled);
    updateSetting('nextTimedChange', Date.now() + 60_000 * Number(minutes));
    updateSetting('nextTimedValue', enabled);
  });
});

/* Scheduling */
const scheduleModalContainer = qs('#schedule_container_background');
const SCHEDULING_OPTION = qs('#settings-schedule');
const OPEN_SCHEDULE_OPTION = qs('#open-schedule');
const RESUME_SCHEDULE_OPTION = qs('#resume-schedule');
const scheduleToggleContainer = qs('#enable-schedule');
const scheduleToggle = qs('svg', scheduleToggleContainer);
const SCHEDULE_TIMES = qs('#schedule-times');
const SCHEDULE_DAYS = qs('#schedule-days');
const SCHEDULE_DAYS_OPTIONS = qsa('div', SCHEDULE_DAYS);
const TIME_PRESETS = qsa('#times-container .predefined-options a');
const DAY_PRESETS = qsa('#days-container .predefined-options a');

function updateTimes(times) {
  SCHEDULE_TIMES.value = times;
  const valid = timeIsValid(times);
  SCHEDULE_TIMES.toggleAttribute('invalid', !valid);
  if (valid) updateSetting('scheduleTimes', times);
}

function updateDays(days) {
  const selectedDays = days.split(',').map(day => day.toLowerCase().trim());
  SCHEDULE_DAYS_OPTIONS.forEach(node => {
    node.toggleAttribute('active', selectedDays.includes(node.getAttribute('day')));
  });
  updateSetting('scheduleDays', days);
}

function closeScheduleModal() {
  scheduleModalContainer.setAttribute('hidden', '');
}

function openScheduleModal() {
  scheduleModalContainer.removeAttribute('hidden');
  browser.storage.local.get(SCHEDULE_SETTINGS).then(settings => {
    scheduleToggle.toggleAttribute('active', settings.schedule);
    updateTimes(settings.scheduleTimes);
    updateDays(settings.scheduleDays);
  });
}

scheduleModalContainer.addEventListener('click', event => {
  if (event.target === scheduleModalContainer) closeScheduleModal();
});
SCHEDULING_OPTION.addEventListener('click', openScheduleModal);
OPEN_SCHEDULE_OPTION.addEventListener('click', openScheduleModal);
RESUME_SCHEDULE_OPTION.addEventListener('click', () => {
  updateSetting('global_enable', checkSchedule(cache.scheduleTimes, cache.scheduleDays));
  updateSetting('nextTimedChange', false);
});
scheduleToggleContainer.addEventListener('click', () => {
  updateSetting('schedule', scheduleToggle.toggleAttribute('active'));
});
SCHEDULE_TIMES.addEventListener('input', () => {
  const times = SCHEDULE_TIMES.value;
  const valid = timeIsValid(times);
  SCHEDULE_TIMES.toggleAttribute('invalid', !valid);
  if (valid) updateSetting('scheduleTimes', times);
});
SCHEDULE_DAYS_OPTIONS.forEach(option => {
  option.addEventListener('click', () => {
    const day = option.getAttribute('day');
    const active = option.toggleAttribute('active');
    const days = HTML.getAttribute('scheduleDays').split(',').filter(Boolean);
    const nextDays = active ? days.concat(day) : days.filter(value => value !== day);
    updateSetting('scheduleDays', nextDays.join(','));
  });
});
TIME_PRESETS.forEach(option => option.addEventListener('click', () => updateTimes(option.getAttribute('times'))));
DAY_PRESETS.forEach(option => option.addEventListener('click', () => updateDays(option.getAttribute('days'))));

/* Password protection */
const passwordModalContainer = qs('#password_container_background');
const ENABLE_PASSWORD_CONTAINER = qs('#enable_password_container');
const PASSWORD_OPTION = qs('#settings-password');
const PASSWORD_INPUT1 = qs('#password-input-1');
const PASSWORD_INPUT2 = qs('#password-input-2');
const PASSWORD_BUTTON = qs('#password-button button');
const UNLOCK_PASSWORD_INPUT = qs('#unlock-password-input');
const UNLOCK_PASSWORD_BUTTON = qs('#unlock-password-button');
const DISABLE_PASSWORD_CONTAINER = qs('#disable_password_container');
const DISABLE_PASSWORD_INPUT = qs('#disable-password-input');
const DISABLE_PASSWORD_BUTTON = qs('#disable-password-button');

function closePasswordModal() {
  passwordModalContainer.setAttribute('hidden', '');
}

function openPasswordModal() {
  passwordModalContainer.removeAttribute('hidden');
  PASSWORD_INPUT1.value = '';
  PASSWORD_INPUT2.value = '';
  browser.storage.local.get(PASSWORD_SETTINGS).then(settings => {
    ENABLE_PASSWORD_CONTAINER.toggleAttribute('hidden', settings.password);
    DISABLE_PASSWORD_CONTAINER.toggleAttribute('hidden', !settings.password);
  });
}

function lockWithPassword() { HTML.removeAttribute('passwordEntered'); }
function unlockWithPassword() { HTML.setAttribute('passwordEntered', 'true'); }

PASSWORD_OPTION.addEventListener('click', openPasswordModal);
passwordModalContainer.addEventListener('click', event => {
  if (event.target === passwordModalContainer) closePasswordModal();
});
PASSWORD_INPUT2.addEventListener('input', () => {
  const matching = PASSWORD_INPUT1.value !== '' && PASSWORD_INPUT1.value === PASSWORD_INPUT2.value;
  PASSWORD_BUTTON.toggleAttribute('disabled', !matching);
});
PASSWORD_BUTTON.addEventListener('click', () => {
  if (PASSWORD_INPUT1.value === '' || PASSWORD_INPUT1.value !== PASSWORD_INPUT2.value) return;
  updateSetting('password', true);
  updateSetting('hashed_password', md5(PASSWORD_INPUT1.value));
  lockWithPassword();
  closePasswordModal();
});
UNLOCK_PASSWORD_BUTTON.addEventListener('click', () => {
  if (md5(UNLOCK_PASSWORD_INPUT.value) !== HTML.getAttribute('hashed_password')) {
    displayStatus('Wrong password');
    return;
  }
  displayStatus('Unlocked');
  unlockWithPassword();
});
DISABLE_PASSWORD_BUTTON.addEventListener('click', () => {
  if (md5(DISABLE_PASSWORD_INPUT.value) !== HTML.getAttribute('hashed_password')) {
    displayStatus('Wrong password');
    return;
  }
  updateSetting('password', false);
  updateSetting('hashed_password', '');
  closePasswordModal();
  displayStatus('Password disabled');
});

/* Local settings */
document.getElementById('log-enable').addEventListener('click', () => updateSetting('log_enabled', true));
document.getElementById('log-disable').addEventListener('click', () => updateSetting('log_enabled', false));

const EXPORT_SETTINGS = document.getElementById('export-settings');
EXPORT_SETTINGS.addEventListener('click', () => {
  browser.storage.local.get().then(async localSettings => {
    await navigator.clipboard.writeText(settingsObjToStr({ ...DEFAULT_SETTINGS, ...localSettings }));
    displayStatus('Settings copied to clipboard');
  });
});

const IMPORT_SETTINGS = document.getElementById('import-settings');
const importModalContainer = document.getElementById('import_container_background');
const importInput = document.getElementById('import_input');
const importSubmit = document.getElementById('import_submit');
IMPORT_SETTINGS.addEventListener('click', () => importModalContainer.removeAttribute('hidden'));
importModalContainer.addEventListener('click', event => {
  if (event.target === importModalContainer) importModalContainer.setAttribute('hidden', '');
});
importSubmit.addEventListener('click', () => {
  try {
    const settings = settingsStrToObj(importInput.value);
    browser.storage.local.set(settings).then(() => {
      updateSettings(settings);
      importModalContainer.setAttribute('hidden', '');
      displayStatus('Settings imported');
    });
  } catch {
    importModalContainer.setAttribute('hidden', '');
    displayStatus('Import failed');
  }
});

function updateSettings(settings) {
  Object.entries(settings).forEach(([id, value]) => updateSetting(id, value, { write: false }));
}

const statusOverlayContainer = document.getElementById('status_overlay_container');
const statusMessage = document.getElementById('status_message');
function displayStatus(message, fadeTime = 1500) {
  statusOverlayContainer.removeAttribute('hidden');
  statusMessage.innerText = message;
  setTimeout(() => statusOverlayContainer.setAttribute('hidden', ''), fadeTime);
}

function settingsObjToStr(settings) {
  const getVal = value => {
    if (value === true || value === false) return value ? 't' : 'f';
    return String(value).replaceAll(delimiter1, '<d1>').replaceAll(delimiter2, '<d2>');
  };
  return prefix + Object.entries(settings)
    .filter(([id]) => idToShortId[id])
    .map(([id, value]) => `${idToShortId[id]}${delimiter1}${getVal(value)}`)
    .join(delimiter2);
}

function settingsStrToObj(settingsStr) {
  if (!settingsStr.startsWith(prefix)) throw new Error('Invalid settings string');
  return settingsStr.slice(prefix.length).split(delimiter2).reduce((settings, item) => {
    const [shortId, value] = item.split(delimiter1);
    if (!(shortId in shortIdToId)) throw new Error('Invalid setting ID');
    settings[shortIdToId[shortId]] = value === 't' ? true : value === 'f' ? false :
      value.replaceAll('<d1>', delimiter1).replaceAll('<d2>', delimiter2);
    return settings;
  }, {});
}
