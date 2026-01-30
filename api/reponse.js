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
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
        res.status(400).json({ error: 'Champs manquants' });
        return;
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
                res.status(409).json({ error: 'Doublon détecté' });
                return;
            }
        }
        const { data: insertData, error: insertError } = await supabase
            .from('reponses')
            .insert([{ nom, prenom, email }])
            .select();
        if (insertError) throw insertError;
        res.status(200).json({ success: true, id: insertData && insertData[0] ? insertData[0].id : null });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de l'insertion" });
    }
};
