const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');
const capaciteFile = path.join(__dirname, 'capacite.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files (CSS, JS) from /static when using the Node server
app.use(express.static(path.join(__dirname, 'static')));

// Pour servir les templates HTML (index.html, reponses.html)
app.use('/templates', express.static(templatesPath));

// Gestion capacité (capacite.json)
function getCapacite() {
    try {
        const data = require(capaciteFile);
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
app.get('/api/places_restantes', (req, res) => {
    const capacite = getCapacite();
    db.get('SELECT COUNT(*) as nb FROM reponses', (err, row) => {
        if (err) return res.status(500).json({ error: 'Erreur DB' });
        const nb_reponses = row.nb;
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.json({ places_restantes, capacite });
    });
});

// Page d'accueil (formulaire)
app.get('/', (req, res) => {
    const fs = require('fs');
    const capacite = getCapacite();
    db.get('SELECT COUNT(*) as nb FROM reponses', (err, row) => {
        const nb_reponses = row ? row.nb : 0;
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
    });
});

// Page admin pour voir les réponses et la capacité
app.get('/reponses', (req, res) => {
    const fs = require('fs');
    const capacite = getCapacite();
    db.all('SELECT id, nom, prenom, email, date FROM reponses ORDER BY id ASC', (err, rows) => {
        db.get('SELECT COUNT(*) as nb FROM reponses', (err2, row2) => {
            const nb_reponses = row2 ? row2.nb : 0;
            let html = fs.readFileSync(path.join(templatesPath, 'reponses.html'), 'utf8');
            html = html.replace(/\{\{ *capacite *\}\}/g, capacite)
                       .replace(/\{\{ *nb_reponses *\}\}/g, nb_reponses);
            // Injection des lignes du tableau à la place du marqueur
            let rowsHtml = '';
            for (const r of rows) {
                rowsHtml += `<tr data-id="${r.id}"><td class="id">${r.id}</td><td class="nom">${r.nom}</td><td class="prenom">${r.prenom}</td><td class="email">${r.email}</td><td><button class="edit-btn">Modifier</button> <button class="delete-btn">Supprimer</button></td></tr>`;
            }
            html = html.replace('<!-- LIGNES_REPONSES -->', rowsHtml);
            res.send(html);
        });
    });
});

// Modifier la capacité (POST depuis admin)
app.post('/reponses', (req, res) => {
    const newCap = parseInt(req.body.capacite);
    if (!isNaN(newCap)) setCapacite(newCap);
    res.redirect('/reponses');
});

// Supprimer une réponse par son id
app.post('/reponses/supprimer/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run('DELETE FROM reponses WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erreur DB' });
        // Réindexation (optionnelle, comme dans Python)
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS reponses_new (id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, prenom TEXT NOT NULL, email TEXT NOT NULL, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
            db.run('INSERT INTO reponses_new (nom, prenom, email, date) SELECT nom, prenom, email, date FROM reponses ORDER BY id ASC');
            db.run('DROP TABLE reponses');
            db.run('ALTER TABLE reponses_new RENAME TO reponses');
            res.status(204).send();
        });
    });
});

// Modifier une réponse par son id
app.post('/reponses/modifier/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Champs manquants' });
    }
    // Vérifier doublon
    function normalize(s) {
        if (!s) return '';
        const decomposed = s.normalize('NFD');
        return decomposed.replace(/\p{Diacritic}/gu, '').toLowerCase();
    }
    const nom_n = normalize(nom);
    const prenom_n = normalize(prenom);
    const email_n = normalize(email);
    db.all('SELECT id, nom, prenom, email FROM reponses', [], (err, rows) => {
        for (const row of rows) {
            if (row.id === id) continue;
            if (normalize(row.nom) === nom_n && normalize(row.prenom) === prenom_n && normalize(row.email) === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        db.run('UPDATE reponses SET nom = ?, prenom = ?, email = ? WHERE id = ?', [nom, prenom, email, id], function(err) {
            if (err) return res.status(500).json({ error: 'Erreur DB' });
            res.json({ success: true });
        });
    });
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
app.get('/api/places_restantes', (req, res) => {
    const capacite = getCapacite();
    db.get('SELECT COUNT(*) as nb FROM reponses', (err, row) => {
        if (err) return res.status(500).json({ error: 'Erreur DB' });
        const nb_reponses = row.nb;
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.json({ places_restantes, capacite });
    });
});

// Page d'accueil (formulaire)
app.get('/', (req, res) => {
    const fs = require('fs');
    const capacite = getCapacite();
    db.get('SELECT COUNT(*) as nb FROM reponses', (err, row) => {
        const nb_reponses = row ? row.nb : 0;
        const places_restantes = Math.max(0, capacite - nb_reponses);
        // Remplacer les variables dans index.html
        let html = fs.readFileSync(path.join(templatesPath, 'index.html'), 'utf8');
        html = html.replace(/\{\{ *places_restantes *\}\}/g, places_restantes)
                   .replace(/\{\{ *capacite *\}\}/g, capacite)
                   .replace(/\{\{ *nb_reponses *\}\}/g, nb_reponses);
        res.send(html);
    });
});

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
