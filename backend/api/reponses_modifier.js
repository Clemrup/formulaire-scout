const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

function normalize(s) {
    if (!s) return '';
    const decomposed = s.normalize('NFD');
    return decomposed.replace(/\p{Diacritic}/gu, '').toLowerCase();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Méthode non autorisée' });
        return;
    }
    const { id, nom, prenom, email } = req.body;
    if (!id || !nom || !prenom || !email) {
        res.status(400).json({ error: 'Champs manquants' });
        return;
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
                res.status(409).json({ error: 'Doublon détecté' });
                return;
            }
        }
        const { error: updateError } = await supabase
            .from('reponses')
            .update({ nom, prenom, email })
            .eq('id', id);
        if (updateError) throw updateError;
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
};
