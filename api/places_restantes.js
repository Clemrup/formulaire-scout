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
    try {
        const capacite = await getCapacite();
        const { count, error } = await supabase
            .from('reponses')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        const nb_reponses = typeof count === 'number' ? count : 0;
        const places_restantes = Math.max(0, capacite - nb_reponses);
        res.status(200).json({ places_restantes, capacite, nb_reponses });
    } catch (err) {
        res.status(500).json({ error: 'Erreur DB', details: err.message });
    }
};
