/**
 * One-time setup script to build the Hiring Hub layout for Busy Bees.
 * Run setupHiringHubLayout() from the Apps Script editor after creating
 * the bound spreadsheet to add headers/tabs/validation that mirror prod.
 */

const TIME_ZONE = 'America/New_York';
const APPLICATION_SHEET_NAMES = ['Application', 'Applications'];
const APPLICATION_NEW_HEADERS = [
  'Stage Started At',
  'Sequence Send Count',
  'Last Send At',
  'Next Send At',
  'Completion Detected At',
  'Opt-Out',
  'Error',
  'Error Message'
];
const PIPELINE_PROGRESS_HEADER = 'Pipeline Progress';
const PIPELINE_VALUES = [
  'Send Ideal Job Test',
  'Ideal Job Test – Waiting for Completion',
  'Ideal Job Test – Completed',
  'Invite to Interview',
  'Invited to Interview – Waiting for Booking',
  'Interview – Booked',
  'Closed – No Response',
  'Notified of Rejection – No Response'
];
// Add any purely informational statuses used by the office here to include in the dropdown.
const PIPELINE_INFO_VALUES = [
  'Pending Initial Review',
  'On Hold'
];

const AUTOMATION_LOG_SHEET = 'Automation Log';
const AUTOMATION_LOG_HEADERS = [
  'Logged At',
  'Email Address',
  'First Name',
  'Last Name',
  'Pipeline Stage',
  'Sequence',
  'Channel',
  'Attempt Number',
  'Template ID',
  'Provider Message ID',
  'Result',
  'Result Detail',
  'Next Send At'
];

const DATE_TIME_FORMAT = 'm/d/yyyy h:mm AM/PM';

function setupHiringHubLayout() {
  const ss = SpreadsheetApp.getActive();
  ensureTimeZone_(ss);

  const applicationSheet = ensureApplicationSheet_(ss);
  const headerMap = ensureApplicationHeaders_(applicationSheet);
  ensurePipelineValidation_(applicationSheet, headerMap);
  formatApplicationColumns_(applicationSheet, headerMap);

  const logSheet = ensureAutomationLogSheet_(ss);
  ensureLogHeadersAndFormat_(logSheet);

  SpreadsheetApp.flush();
}

function ensureTimeZone_(ss) {
  const current = ss.getSpreadsheetTimeZone();
  if (current !== TIME_ZONE) {
    ss.setSpreadsheetTimeZone(TIME_ZONE);
    Logger.log('Spreadsheet time zone set to ' + TIME_ZONE);
  }
}

function ensureApplicationSheet_(ss) {
  for (const name of APPLICATION_SHEET_NAMES) {
    const existing = ss.getSheetByName(name);
    if (existing) return existing;
  }
  Logger.log('No Application sheet found; creating "' + APPLICATION_SHEET_NAMES[0] + '".');
  return ss.insertSheet(APPLICATION_SHEET_NAMES[0]);
}

function ensureApplicationHeaders_(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  const normalizedHeaderMap = buildHeaderMap_(headerRow);

  let lastCol = headerRow.length || 1;
  APPLICATION_NEW_HEADERS.forEach(function(header) {
    if (!normalizedHeaderMap.hasOwnProperty(normalizeHeader_(header))) {
      sheet.getRange(1, lastCol + 1).setValue(header);
      normalizedHeaderMap[normalizeHeader_(header)] = lastCol + 1;
      lastCol += 1;
    }
  });

  return normalizedHeaderMap;
}

function ensurePipelineValidation_(sheet, headerMap) {
  const normalizedKey = normalizeHeader_(PIPELINE_PROGRESS_HEADER);
  const col = headerMap[normalizedKey];
  if (!col) {
    Logger.log('Pipeline Progress column not found; skipping validation.');
    return;
  }

  const listValues = PIPELINE_VALUES.concat(PIPELINE_INFO_VALUES);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(listValues, true)
    .setAllowInvalid(false)
    .build();

  const numRows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, col, numRows, 1).setDataValidation(rule);
}

function formatApplicationColumns_(sheet, headerMap) {
  const dateColumns = [
    'Stage Started At',
    'Last Send At',
    'Next Send At',
    'Completion Detected At'
  ];
  dateColumns.forEach(function(header) {
    const col = headerMap[normalizeHeader_(header)];
    if (col) {
      const numRows = Math.max(sheet.getMaxRows() - 1, 1);
      sheet.getRange(2, col, numRows, 1).setNumberFormat(DATE_TIME_FORMAT);
    }
  });

  const countCol = headerMap[normalizeHeader_('Sequence Send Count')];
  if (countCol) {
    const numRows = Math.max(sheet.getMaxRows() - 1, 1);
    sheet.getRange(2, countCol, numRows, 1).setNumberFormat('0');
  }

  const optOutCol = headerMap[normalizeHeader_('Opt-Out')];
  if (optOutCol) {
    const range = sheet.getRange(2, optOutCol, sheet.getMaxRows() - 1 || 1, 1);
    range.insertCheckboxes();
  }

  const errorCol = headerMap[normalizeHeader_('Error')];
  if (errorCol) {
    const range = sheet.getRange(2, errorCol, sheet.getMaxRows() - 1 || 1, 1);
    range.insertCheckboxes();
  }

  const phoneCol = headerMap[normalizeHeader_('Cell Phone Number')];
  if (phoneCol) {
    const numRows = Math.max(sheet.getMaxRows() - 1, 1);
    sheet.getRange(2, phoneCol, numRows, 1).setNumberFormat('@');
  }
}

function ensureAutomationLogSheet_(ss) {
  let sheet = ss.getSheetByName(AUTOMATION_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUTOMATION_LOG_SHEET);
    Logger.log('Created Automation Log sheet.');
  }
  return sheet;
}

function ensureLogHeadersAndFormat_(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, AUTOMATION_LOG_HEADERS.length).getValues()[0];
  AUTOMATION_LOG_HEADERS.forEach(function(header, index) {
    if (headerRow[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });

  sheet.setFrozenRows(1);

  const dateColumns = [1, AUTOMATION_LOG_HEADERS.indexOf('Next Send At') + 1];
  const numRows = Math.max(sheet.getMaxRows() - 1, 1);
  dateColumns.forEach(function(col) {
    sheet.getRange(2, col, numRows, 1).setNumberFormat(DATE_TIME_FORMAT);
  });
}

function buildHeaderMap_(headers) {
  return headers.reduce(function(map, header, idx) {
    const key = normalizeHeader_(header);
    if (key) {
      map[key] = idx + 1; // 1-based index
    }
    return map;
  }, {});
}

function normalizeHeader_(header) {
  return (header || '').toString().trim().toLowerCase();
}
