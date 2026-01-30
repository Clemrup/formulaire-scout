const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

const templatesPath = path.join(__dirname, 'templates');

// Connexion Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
        const { data, error } = await supabase
            .from('config')
            .select('capacite')
            .order('id', { ascending: false })
            .limit(1)
            .single();
        if (error) throw error;
        return data && data.capacite ? data.capacite : 20;
    } catch {
        return 20;
    }
}
async function setCapacite(val) {
    // Met à jour la capacité dans la table config (remplace la dernière valeur)
    const { data, error } = await supabase
        .from('config')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();
    if (data && data.id) {
        await supabase.from('config').update({ capacite: val }).eq('id', data.id);
    }
}

// API pour obtenir dynamiquement le nombre de places restantes
app.get('/api/places_restantes', async (req, res) => {
    try {
        const capacite = await getCapacite();
        const { data, error } = await supabase
            .from('reponses')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        const nb_reponses = data ? data.length : 0;
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.json({ places_restantes, capacite });
    } catch (err) {
        console.error('Erreur /api/places_restantes:', err);
        res.status(500).json({ error: 'Erreur DB', details: err.message });
    }
});

// Page d'accueil (formulaire)
app.get('/', async (req, res) => {
    const fs = require('fs');
    try {
        const capacite = await getCapacite();
        const { data, error } = await supabase
            .from('reponses')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        const nb_reponses = data ? data.length : 0;
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
        <form id=\"formulaire\">\n            <label for=\"nom\">Nom :</label>\n            <input type=\"text\" id=\"nom\" name=\"nom\" required>\n            <label for=\"prenom\">Prénom :</label>\n            <input type=\"text\" id=\"prenom\" name=\"prenom\" required>\n            <label for=\"email\">Adresse e-mail :</label>\n            <input type=\"email\" id=\"email\" name=\"email\" required>\n            <button type=\"submit\">Envoyer</button>\n        </form>\n        <div class=\"success\" id=\"successMsg\" style=\"display:none;\">Réponse enregistrée !</div>\n        <div class=\"error\" id=\"errorMsg\" style=\"display:none; color:red; margin-top:10px;\"></div>\n            `;
        } else {
            bloc = `<div style=\"color:red; font-weight:bold;\">⚠️ La capacité maximale est atteinte, il n'est plus possible de s'inscrire.</div>`;
        }
        html = html.replace('<!-- Le backend Node.js doit injecter dynamiquement le formulaire ou le message de capacité ici -->', bloc);
        res.send(html);
    } catch (err) {
        console.error('Erreur / (accueil):', err);
        res.status(500).send('Erreur lors de la récupération des données: ' + err.message);
    }

    if (!isNaN(newCap)) await setCapacite(newCap);
    res.redirect('/reponses');
});

// Supprimer une réponse par son id
app.post('/reponses/supprimer/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const { error } = await supabase.from('reponses').delete().eq('id', id);
        if (error) throw error;
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
        const { data: rows, error } = await supabase.from('reponses').select('id, nom, prenom, email');
        if (error) throw error;
        for (const row of rows) {
            if (row.id === id) continue;
            if (normalize(row.nom) === nom_n && normalize(row.prenom) === prenom_n && normalize(row.email) === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        const { error: updateError } = await supabase
            .from('reponses')
            .update({ nom, prenom, email })
            .eq('id', id);
        if (updateError) throw updateError;
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

// (Connexion Supabase déjà faite plus haut)

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
        const { data: rows, error } = await supabase.from('reponses').select('nom, prenom, email');
        if (error) throw error;
        for (const row of rows) {
            const rnom = normalize(row.nom);
            const rprenom = normalize(row.prenom);
            const remail = normalize(row.email);
            if (rnom === nom_n && rprenom === prenom_n && remail === email_n) {
                return res.status(409).json({ error: 'Doublon détecté' });
            }
        }
        const { data: insertData, error: insertError } = await supabase
            .from('reponses')
            .insert([{ nom, prenom, email }])
            .select();
        if (insertError) throw insertError;
        res.json({ success: true, id: insertData && insertData[0] ? insertData[0].id : null });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de l'insertion" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur backend démarré sur http://localhost:${PORT}`);
});
