const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Méthode non autorisée' });
        return;
    }
    try {
        const { data, error } = await supabase
            .from('reponses')
            .select('id, nom, prenom, email');
        if (error) throw error;
        res.status(200).json({ reponses: data });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB', details: err.message });
    }
};
