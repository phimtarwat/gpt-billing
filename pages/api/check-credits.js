import { GoogleSpreadsheet } from "google-spreadsheet";

export default async function handler(req, res) {
  try {
    const decoded = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64,
      "base64"
    ).toString("utf8");
    const creds = JSON.parse(decoded);

    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key,
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    res.status(200).json({ ok: true, totalRows: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
