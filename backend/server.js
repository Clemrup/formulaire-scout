const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
// Serve static files (CSS, JS) from /static when using the Node server
app.use(express.static(path.join(__dirname, 'static')));

// Création de la base de données SQLite
const dbPath = path.join(__dirname, 'formulaire.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Erreur ouverture DB:', err.message);
    console.log('Connecté à la base SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS reponses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Route pour recevoir les réponses du formulaire
app.post('/api/reponse', (req, res) => {
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Champs manquants' });
    }
    // Normalize helper: remove diacritics and lowercase
    function normalize(s) {
        if (!s) return '';
        // Unicode NFD decomposition
        const decomposed = s.normalize('NFD');
        // remove combining diacritical marks (U+0300 - U+036F)
        return decomposed.replace(/\p{Diacritic}/gu, '').toLowerCase();
    }
    const nom_n = normalize(nom);
    const prenom_n = normalize(prenom);
    const email_n = normalize(email);
    db.all('SELECT id, nom, prenom, email FROM reponses', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erreur DB' });
        for (const row of rows) {
            const rnom = normalize(row.nom);
            const rprenom = normalize(row.prenom);
            const remail = normalize(row.email);
            if (rnom === nom_n && rprenom === prenom_n && remail === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        db.run('INSERT INTO reponses (nom, prenom, email) VALUES (?, ?, ?)', [nom, prenom, email], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de l\'insertion' });
            }
            res.json({ success: true, id: this.lastID });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
