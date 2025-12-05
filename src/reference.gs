/***********************
 * SCRIPT PROPERTIES
 ***********************/
const PROPS = PropertiesService.getScriptProperties();



/***********************
 * READ CONFIG VALUES
 ***********************/
function getConfig_(key) {
  return PROPS.getProperty(key);
}

/***********************
 * TWILIO SENDER
 ***********************/
function sendTwilioSMS_(to, body) {
  const useVirtual = getConfig_('USE_VIRTUAL_PHONE_ONLY') === 'true';

  if (!to && !useVirtual) {
    Logger.log('No phone number provided, skipping SMS. Body: ' + body);
    return;
  }

  if (useVirtual) {
    const virtualPhone = getConfig_('TEST_VIRTUAL_PHONE');
    Logger.log('USE_VIRTUAL_PHONE_ONLY is true; overriding destination with virtual phone: ' + virtualPhone);
    to = virtualPhone;
  }

  const accountSid = getConfig_('TWILIO_ACCOUNT_SID');
  const authToken = getConfig_('TWILIO_AUTH_TOKEN');
  const messagingServiceSid = getConfig_('TWILIO_MESSAGING_SERVICE_SID');

  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json';

  const payload = {
    To: to,
    MessagingServiceSid: messagingServiceSid,
    Body: body
  };

  const options = {
    method: 'post',
    payload: payload,
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log('Twilio response: ' + response.getResponseCode());
  Logger.log(response.getContentText());
}

/***********************
 * TRIGGER SETUP
 ***********************/
function createBusyBeesTriggers() {
  const ss = SpreadsheetApp.getActive();

  ScriptApp.newTrigger('handleApplicationsFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('handleCandidatesEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

/***********************
 * HANDLER 1:
 * Applications sheet form submit
 ***********************/
function handleApplicationsFormSubmit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Applications') return;

  const row = e.range.getRow();
  const name  = sheet.getRange(row, 2).getValue();
  const phone = sheet.getRange(row, 3).getValue();

  const body = 'Hi, ' + name + ', we received your application!';
  sendTwilioSMS_(phone, body);
}

/***********************
 * HANDLER 2:
 * Candidates sheet pipeline progress change
 ***********************/
function handleCandidatesEdit(e) {
  const sheet = e.range.getSheet();

  // Debug logging so we can see what the trigger is receiving
  Logger.log('Edit event on sheet: ' + sheet.getName() +
             ', row: ' + e.range.getRow() +
             ', col: ' + e.range.getColumn() +
             ', newValue: ' + e.value +
             ', oldValue: ' + e.oldValue);

  // Only care about the Candidates tab
  if (sheet.getName() !== 'Candidates') return;

  // Only react to edits in Column D (4)
  const col = e.range.getColumn();
  if (col !== 4) return;

  // Normalize the new value
  const newValue = (e.value || '').toString().trim();
  if (newValue !== 'Invite to Interview') {
    return; // do nothing for other statuses
  }

  const row = e.range.getRow();
  const name  = sheet.getRange(row, 2).getValue(); // Column B: Name
  const phone = sheet.getRange(row, 5).getValue(); // Column E: Phone Number

  const body = 'Hi, ' + name + '! We\'re inviting you to interview.';
  sendTwilioSMS_(phone, body);
}