/**
 * Google Apps Script — Vote Handler for Event Horizon
 *
 * SETUP:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Click Deploy > New deployment (or update existing)
 * 5. Type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click Deploy, authorize, and copy the Web App URL
 * 9. Paste that URL into CONFIG.sheetUrl in app.js
 *
 * SHEET LAYOUT (Column A = key, Column B = value):
 *   Row 1: A        | B
 *   Row 2: taste_yes | 0
 *   Row 3: taste_no  | 0
 *   Row 4: cross     | 0
 *   Row 5: doubt     | 0
 *   Row 6: fun_fact  | 72% prefer iced
 *
 * API:
 *   ?action=read          → returns JSON of all key-value pairs
 *   ?action=vote&type=X   → increments vote type X
 *
 * QR CODE:
 *   Point your QR code to: https://your-site.com/?qr=1
 *   When someone scans it, the page auto-submits a "taste_yes" vote.
 */

function doGet(e) {
  var action = e.parameter.action || '';

  // --- READ: return all current vote counts ---
  if (action === 'read') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getRange('A2:B' + sheet.getLastRow()).getValues();
    var result = {};
    for (var i = 0; i < data.length; i++) {
      var key = String(data[i][0]).trim();
      var val = data[i][1];
      if (key) result[key] = val;
    }
    return ContentService.createTextOutput(
      JSON.stringify(result)
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // --- VOTE: increment a vote type ---
  if (action === 'vote') {
    var voteType = e.parameter.type;
    var allowed = ['taste_yes', 'taste_no', 'cross', 'doubt'];

    if (!voteType || allowed.indexOf(voteType) === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Invalid vote type' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getRange('A2:B' + sheet.getLastRow()).getValues();

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === voteType) {
        var currentVal = parseInt(data[i][1], 10) || 0;
        sheet.getRange(i + 2, 2).setValue(currentVal + 1);

        return ContentService.createTextOutput(
          JSON.stringify({ ok: true, type: voteType, count: currentVal + 1 })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Key not found in sheet' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // --- FALLBACK: legacy ?vote=X format ---
  var legacyVote = e.parameter.vote;
  if (legacyVote) {
    e.parameter.action = 'vote';
    e.parameter.type = legacyVote;
    return doGet(e);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ error: 'Missing action parameter. Use ?action=read or ?action=vote&type=X' })
  ).setMimeType(ContentService.MimeType.JSON);
}
