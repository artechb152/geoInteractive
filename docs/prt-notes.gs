/**
 * Google Apps Script — מקבל הערות מכפתור המשוב של /prt ומוסיף אותן
 * לגיליון. פרוס כ-Web App:  Execute as: Me  •  Who has access: Anyone.
 * הדבק את ה-URL שמסתיים ב-/exec לתוך NOTES_ENDPOINT שב-src/lib/prt-config.ts.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // שורת כותרות בפעם הראשונה
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['תאריך', 'שם', 'הערה', 'הקשר', 'נתיב', 'URL', 'דפדפן']);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.message || '',
      data.context || '',
      data.path || '',
      data.url || '',
      data.userAgent || ''
    ]);

    // אופציונלי — מייל על כל הערה. בטל את ההערה כדי להפעיל:
    // MailApp.sendEmail('artechb152@gmail.com', 'הערה חדשה ב-/prt', data.message + '\n\n' + (data.context || ''));

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
