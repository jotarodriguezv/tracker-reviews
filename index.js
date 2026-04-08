const express = require("express");
const { google } = require("googleapis");

const app = express();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GMB_URL = process.env.GMB_URL;
const SERVICE_ACCOUNT_JSON = process.env.SERVICE_ACCOUNT_JSON;

async function registrarClic(telefono) {
  const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const fechaHora = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:B`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[telefono, fechaHora]],
    },
  });
}

app.get("/r", async (req, res) => {
  const telefono = req.query.tel || "desconocido";
  try {
    await registrarClic(telefono);
  } catch (err) {
    console.error("Error registrando clic:", err.message);
  }
  res.redirect(GMB_URL);
});

app.get("/health", (req, res) => res.send("OK"));

app.listen(3000, () => console.log("Tracker corriendo en puerto 3000"));
