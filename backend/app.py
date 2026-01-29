
# =====================
# Imports et variables globales
# =====================
from flask import Flask, request, jsonify, render_template
import sqlite3
from flask_cors import CORS
import os
import json
import unicodedata

DB_PATH = os.path.join(os.path.dirname(__file__), 'formulaire.db')
CAPACITY_FILE = os.path.join(os.path.dirname(__file__), 'capacite.json')

# =====================
# Fonctions utilitaires
# =====================
def get_capacite():
    """Retourne la capacité maximale depuis le fichier, ou 20 par défaut."""
    if not os.path.exists(CAPACITY_FILE):
        return 20
    with open(CAPACITY_FILE, 'r') as f:
        return json.load(f).get('capacite', 20)

def set_capacite(val):
    """Modifie la capacité maximale et la sauvegarde dans le fichier."""
    with open(CAPACITY_FILE, 'w') as f:
        json.dump({'capacite': val}, f)

def init_db():
    """Crée la table reponses si elle n'existe pas."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reponses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # Si la table existait sans colonne email, on ajoute la colonne
    c.execute("PRAGMA table_info(reponses)")
    cols = [row[1] for row in c.fetchall()]
    if 'email' not in cols:
        try:
            c.execute('ALTER TABLE reponses ADD COLUMN email TEXT')
        except Exception:
            pass
    conn.commit()
    conn.close()

# =====================
# Création de l'app Flask
# =====================
app = Flask(__name__)
CORS(app)

# =====================
# ROUTES FLASK
# =====================

@app.route('/')
def index():
    """Page d'accueil avec le formulaire d'inscription."""
    capacite = get_capacite()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM reponses')
    nb_reponses = c.fetchone()[0]
    conn.close()
    places_restantes = max(0, capacite - nb_reponses)
    return render_template('index.html', capacite=capacite, nb_reponses=nb_reponses, places_restantes=places_restantes)

@app.route('/api/places_restantes')
def api_places_restantes():
    """API pour obtenir dynamiquement le nombre de places restantes."""
    capacite = get_capacite()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM reponses')
    nb_reponses = c.fetchone()[0]
    conn.close()
    places_restantes = max(0, capacite - nb_reponses)
    return jsonify({
        'places_restantes': places_restantes,
        'capacite': capacite
    })

@app.route('/api/reponse', methods=['POST'])
def enregistrer_reponse():
    """API pour enregistrer une nouvelle réponse (nom, prénom)."""
    data = request.get_json()
    nom = data.get('nom')
    prenom = data.get('prenom')
    email = data.get('email')
    if not nom or not prenom or not email:
        return jsonify({'error': 'Champs manquants'}), 400
    # Vérification capacité côté serveur
    capacite = get_capacite()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM reponses')
    nb_reponses = c.fetchone()[0]
    if nb_reponses >= capacite:
        conn.close()
        return jsonify({'error': 'Capacité atteinte'}), 403
    # Empêcher les doublons en ignorant majuscules et accents
    def normalize(s):
        if not s:
            return ''
        s = unicodedata.normalize('NFD', s)
        s = ''.join(ch for ch in s if not unicodedata.combining(ch))
        return s.casefold()

    nom_n = normalize(nom)
    prenom_n = normalize(prenom)
    email_n = normalize(email)
    c.execute('SELECT id, nom, prenom, email FROM reponses')
    for row in c.fetchall():
        _, rnom, rprenom, remail = row
        if nom_n == normalize(rnom) and prenom_n == normalize(rprenom) and email_n == normalize(remail):
            conn.close()
            return jsonify({'error': 'Doublon détecté'}), 409
    c.execute('INSERT INTO reponses (nom, prenom, email) VALUES (?, ?, ?)', (nom, prenom, email))
    conn.commit()
    last_id = c.lastrowid
    conn.close()
    return jsonify({'success': True, 'id': last_id})

@app.route('/reponses', methods=['GET', 'POST'])
def afficher_reponses():
    """Page admin pour voir, modifier, supprimer les réponses et gérer la capacité."""
    if request.method == 'POST':
        try:
            new_cap = int(request.form.get('capacite'))
            set_capacite(new_cap)
        except Exception as e:
            print(f"Erreur modification capacité : {e}")
    capacite = get_capacite()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT id, nom, prenom, email, date FROM reponses ORDER BY id ASC')
    reponses = c.fetchall()
    c.execute('SELECT COUNT(*) FROM reponses')
    nb_reponses = c.fetchone()[0]
    conn.close()
    return render_template('reponses.html', reponses=reponses, capacite=capacite, nb_reponses=nb_reponses)

@app.route('/reponses/supprimer/<int:id>', methods=['POST'])
def supprimer_reponse(id):
    """Supprime une réponse par son id."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('DELETE FROM reponses WHERE id = ?', (id,))
        conn.commit()
        # Rebuild the table to reset sequential IDs (no gaps)
        # Note: this will recreate the table and assign new ids in the same order (by date DESC)
        c.execute('BEGIN')
        c.execute('''CREATE TABLE IF NOT EXISTS reponses_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            email TEXT NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Preserve ordering by id ASC when reassigning new ids
        c.execute('INSERT INTO reponses_new (nom, prenom, email, date) SELECT nom, prenom, email, date FROM reponses ORDER BY id ASC')
        c.execute('DROP TABLE reponses')
        c.execute('ALTER TABLE reponses_new RENAME TO reponses')
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Erreur lors de la suppression/réinitialisation des IDs : {e}")
    finally:
        conn.close()
    return ('', 204)

@app.route('/reponses/modifier/<int:id>', methods=['POST'])
def modifier_reponse(id):
    """Modifie le nom et le prénom d'une réponse par son id."""
    data = request.get_json()
    nom = data.get('nom')
    prenom = data.get('prenom')
    email = data.get('email')
    if not nom or not prenom or not email:
        return jsonify({'error': 'Champs manquants'}), 400
    # Prevent creating a duplicate after modification (ignore case and accents)
    def normalize(s):
        if not s:
            return ''
        s = unicodedata.normalize('NFD', s)
        s = ''.join(ch for ch in s if not unicodedata.combining(ch))
        return s.casefold()

    nom_n = normalize(nom)
    prenom_n = normalize(prenom)
    email_n = normalize(email)
    conn_check = sqlite3.connect(DB_PATH)
    c_check = conn_check.cursor()
    c_check.execute('SELECT id, nom, prenom, email FROM reponses')
    for row in c_check.fetchall():
        rid, rnom, rprenom, remail = row
        if rid == id:
            continue
        if nom_n == normalize(rnom) and prenom_n == normalize(rprenom) and email_n == normalize(remail):
            conn_check.close()
            return jsonify({'error': 'Doublon détecté'}), 409
    conn_check.close()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('UPDATE reponses SET nom = ?, prenom = ?, email = ? WHERE id = ?', (nom, prenom, email, id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# =====================
# Lancement de l'app
# =====================
if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=3000, debug=True)
