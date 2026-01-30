const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Méthode non autorisée' });
        return;
    }
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ error: 'ID manquant' });
        return;
    }
    try {
        const { error } = await supabase.from('reponses').delete().eq('id', id);
        if (error) throw error;
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB' });
    }
};
