const express = require("express");
const { google } = require("googleapis");

const app = express();

const SERVICE_ACCOUNT_JSON = process.env.SERVICE_ACCOUNT_JSON;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getConfigNegocio(slug) {
  const key = `NEGOCIO_${slug}`;
  const raw = process.env[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getSheetsClient() {
  const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function getFechaHora() {
  return new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  });
}

async function registrarClic(telefono, hoja) {
  const sheets = await getSheetsClient();

  // Leer todas las filas para encontrar la del teléfono
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${hoja}!A:C`,
  });

  const filas = response.data.values || [];

  // Buscar la última fila con ese teléfono que no tenga fecha_clic
  let filaIndex = -1;
  for (let i = filas.length - 1; i >= 1; i--) {
    if (filas[i][0] === telefono && !filas[i][2]) {
      filaIndex = i + 1; // +1 porque Sheets es 1-indexed
      break;
    }
  }

  if (filaIndex === -1) {
    // No encontró fila pendiente, hace append como fallback
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${hoja}!A:C`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[telefono, "", getFechaHora()]],
      },
    });
    return;
  }

  // Actualizar solo la columna C (Fecha_Clic) de esa fila
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${hoja}!C${filaIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[getFechaHora()]],
    },
  });
}

app.get("/r", async (req, res) => {
  const telefono = req.query.tel || "desconocido";
  const negocio = req.query.negocio;

  if (!negocio) {
    return res.status(400).send("Parámetro negocio requerido");
  }

  const config = getConfigNegocio(negocio);

  if (!config) {
    return res.status(404).send("Negocio no encontrado");
  }

  try {
    await registrarClic(telefono, config.hoja);
  } catch (err) {
    console.error("Error registrando clic:", err.message);
  }

  res.redirect(config.gmb);
});

app.get("/health", (req, res) => res.send("OK"));

app.listen(3000, () => console.log("Tracker corriendo en puerto 3000"));
