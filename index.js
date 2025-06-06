require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Modelo candidato
const candidatoSchema = new mongoose.Schema({
  nombre: String,
  correo: String,
  telefono: String,
  puesto: String,
  url_cv: String,
  linkedin: String,  // <-- Agrega esto
  fechaRegistro: { type: Date, default: Date.now },
});

const Candidato = mongoose.model('Candidato', candidatoSchema);

// Multer config (temporal storage)
const upload = multer({ dest: 'uploads/' });

// Endpoint para registrar candidato y subir PDF
app.post('/api/candidatos', upload.single('cv'), async (req, res) => {
  try {
    const { nombre, correo, telefono, puesto, linkedin } = req.body;
    const cvPath = req.file.path;

    // Subir a Cloudinary (tipo raw para PDF)
    const result = await cloudinary.uploader.upload(cvPath, {
      resource_type: 'raw',
      folder: 'cvs', // opcional, crea carpeta en Cloudinary
    });

    // Guardar en BD
    const candidato = new Candidato({
      nombre,
      correo,
      telefono,
      puesto,
      url_cv: result.secure_url,
      linkedin,
    });
    await candidato.save();

    // Borrar archivo temporal
    fs.unlinkSync(cvPath);

    res.json({ ok: true, candidato });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint para listar candidatos
app.get('/api/candidatos', async (req, res) => {
  try {
    const { puesto } = req.query;
    let query = {};
    if (puesto) query.puesto = puesto;
    const candidatos = await Candidato.find(query).sort({ fechaRegistro: -1 });
    res.json(candidatos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('Servidor corriendo en puerto', PORT));
