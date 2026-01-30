const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files (CSS, JS) from /static when using the Node server
app.use(express.static(path.join(__dirname, 'static')));

// Pour servir les templates HTML (index.html, reponses.html)
app.use('/templates', express.static(templatesPath));

// Capacité stockée dans la base Supabase
async function getCapacite() {
    try {
        const result = await db.query('SELECT capacite FROM config ORDER BY id DESC LIMIT 1');
        return result.rows.length > 0 ? result.rows[0].capacite : 20;
    } catch {
        return 20;
    }
}
async function setCapacite(val) {
    // Met à jour la capacité dans la table config (remplace la dernière valeur)
    await db.query('UPDATE config SET capacite = $1 WHERE id = (SELECT id FROM config ORDER BY id DESC LIMIT 1)', [val]);
}

// API pour obtenir dynamiquement le nombre de places restantes
app.get('/api/places_restantes', async (req, res) => {
    try {
        const capacite = await getCapacite();
        const result = await db.query('SELECT COUNT(*) as nb FROM reponses');
        const nb_reponses = parseInt(result.rows[0].nb, 10);
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.json({ places_restantes, capacite });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
});

// Page d'accueil (formulaire)
app.get('/', async (req, res) => {
    const fs = require('fs');
    try {
        const capacite = await getCapacite();
        const result = await db.query('SELECT COUNT(*) as nb FROM reponses');
        const nb_reponses = parseInt(result.rows[0].nb, 10);
        const places_restantes = Math.max(0, capacite - nb_reponses);
        let html = fs.readFileSync(path.join(templatesPath, 'index.html'), 'utf8');
        html = html.replace(/\{\{ *places_restantes *\}\}/g, places_restantes)
                   .replace(/\{\{ *capacite *\}\}/g, capacite)
                   .replace(/\{\{ *nb_reponses *\}\}/g, nb_reponses);
        let bloc = '';
        if (places_restantes > 0) {
            bloc = `
        <form id="formulaire">
            <label for="nom">Nom :</label>
            <input type="text" id="nom" name="nom" required>
            <label for="prenom">Prénom :</label>
            <input type="text" id="prenom" name="prenom" required>
            <label for="email">Adresse e-mail :</label>
            <input type="email" id="email" name="email" required>
            <button type="submit">Envoyer</button>
        </form>
        <div class="success" id="successMsg" style="display:none;">Réponse enregistrée !</div>
        <div class="error" id="errorMsg" style="display:none; color:red; margin-top:10px;"></div>
            `;
        } else {
            bloc = `<div style="color:red; font-weight:bold;">⚠️ La capacité maximale est atteinte, il n'est plus possible de s'inscrire.</div>`;
        }
        html = html.replace('<!-- Le backend Node.js doit injecter dynamiquement le formulaire ou le message de capacité ici -->', bloc);
        res.send(html);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des données');
    }
});

// Page admin pour voir les réponses et la capacité
app.get('/reponses', async (req, res) => {
    const fs = require('fs');
    const capacite = getCapacite();
    try {
        const rowsResult = await db.query('SELECT id, nom, prenom, email, date FROM reponses ORDER BY id ASC');
        const countResult = await db.query('SELECT COUNT(*) as nb FROM reponses');
        const nb_reponses = parseInt(countResult.rows[0].nb, 10);
        let html = fs.readFileSync(path.join(templatesPath, 'reponses.html'), 'utf8');
        html = html.replace(/\{\{ *capacite *\}\}/g, capacite)
                   .replace(/\{\{ *nb_reponses *\}\}/g, nb_reponses);
        let rowsHtml = '';
        for (const r of rowsResult.rows) {
            rowsHtml += `<tr data-id="${r.id}"><td class="id">${r.id}</td><td class="nom">${r.nom}</td><td class="prenom">${r.prenom}</td><td class="email">${r.email}</td><td><button class="edit-btn">Modifier</button> <button class="delete-btn">Supprimer</button></td></tr>`;
        }
        html = html.replace('<!-- LIGNES_REPONSES -->', rowsHtml);
        res.send(html);
    } catch (err) {
        res.status(500).send('Erreur lors de la récupération des réponses');
    }
});

// Modifier la capacité (POST depuis admin)
app.post('/reponses', async (req, res) => {
    const newCap = parseInt(req.body.capacite);
    if (!isNaN(newCap)) await setCapacite(newCap);
    res.redirect('/reponses');
});

// Supprimer une réponse par son id
app.post('/reponses/supprimer/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await db.query('DELETE FROM reponses WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
});

// Modifier une réponse par son id
app.post('/reponses/modifier/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Champs manquants' });
    }
    function normalize(s) {
        if (!s) return '';
        const decomposed = s.normalize('NFD');
        return decomposed.replace(/\p{Diacritic}/gu, '').toLowerCase();
    }
    const nom_n = normalize(nom);
    const prenom_n = normalize(prenom);
    const email_n = normalize(email);
    try {
        const rows = (await db.query('SELECT id, nom, prenom, email FROM reponses')).rows;
        for (const row of rows) {
            if (row.id === id) continue;
            if (normalize(row.nom) === nom_n && normalize(row.prenom) === prenom_n && normalize(row.email) === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        await db.query('UPDATE reponses SET nom = $1, prenom = $2, email = $3 WHERE id = $4', [nom, prenom, email, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
});

// ...existing code...
function getCapacite() {
    const fs = require('fs');
    try {
        const raw = fs.readFileSync(capaciteFile, 'utf8');
        const data = JSON.parse(raw);
        return data.capacite || 20;
    } catch {
        return 20;
    }
}
function setCapacite(val) {
    const fs = require('fs');
    fs.writeFileSync(capaciteFile, JSON.stringify({ capacite: val }, null, 2));
}

// API pour obtenir dynamiquement le nombre de places restantes
app.get('/api/places_restantes', async (req, res) => {
    const capacite = getCapacite();
    try {
        const result = await db.query('SELECT COUNT(*) as nb FROM reponses');
        const nb_reponses = parseInt(result.rows[0].nb, 10);
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.json({ places_restantes, capacite });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
});

// Connexion à PostgreSQL (Supabase)
const db = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false }
});

db.connect((err, client, release) => {
    if (err) {
        return console.error('Erreur connexion PostgreSQL:', err.stack);
    }
    console.log('Connecté à PostgreSQL (Supabase)');
    release();
});

// Route pour recevoir les réponses du formulaire
app.post('/api/reponse', async (req, res) => {
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Champs manquants' });
    }
    function normalize(s) {
        if (!s) return '';
        const decomposed = s.normalize('NFD');
        return decomposed.replace(/\p{Diacritic}/gu, '').toLowerCase();
    }
    const nom_n = normalize(nom);
    const prenom_n = normalize(prenom);
    const email_n = normalize(email);
    try {
        const { rows } = await db.query('SELECT nom, prenom, email FROM reponses');
        for (const row of rows) {
            const rnom = normalize(row.nom);
            const rprenom = normalize(row.prenom);
            const remail = normalize(row.email);
            if (rnom === nom_n && rprenom === prenom_n && remail === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        const insertResult = await db.query('INSERT INTO reponses (nom, prenom, email) VALUES ($1, $2, $3) RETURNING id', [nom, prenom, email]);
        res.json({ success: true, id: insertResult.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de l'insertion" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
