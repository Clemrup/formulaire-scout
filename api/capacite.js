const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function getCapacite() {
    const { data, error } = await supabase
        .from('config')
        .select('capacite')
        .order('id', { ascending: false })
        .limit(1)
        .single();
    if (error) return 20;
    return data && data.capacite ? data.capacite : 20;
}

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        // Lecture de la capacité
        try {
            const capacite = await getCapacite();
            res.status(200).json({ capacite });
        } catch (err) {
            res.status(500).json({ error: 'Erreur DB' });
        }
    } else if (req.method === 'POST') {
        // Modification de la capacité
        const { capacite } = req.body;
        const newCap = parseInt(capacite, 10);
        if (isNaN(newCap) || newCap < 0) {
            res.status(400).json({ error: 'Capacité invalide' });
            return;
        }
        try {
            const { data, error } = await supabase
                .from('config')
                .select('id')
                .order('id', { ascending: false })
                .limit(1)
                .single();
            if (data && data.id) {
                await supabase.from('config').update({ capacite: newCap }).eq('id', data.id);
            }
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Erreur lors de la mise à jour de la capacité' });
        }
    } else {
        res.status(405).json({ error: 'Méthode non autorisée' });
    }
};
