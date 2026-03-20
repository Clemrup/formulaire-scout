const path = require('path');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
// Configurer le transporteur Nodemailer (exemple Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lescompaventhuriers@gmail.com',
        pass: 'novi cjym kpjn gpyl' // mot de passe d'application
    }
});

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
            if (rnom === nom_n && rprenom === prenom_n) {
                res.status(409).json({ error: 'Doublon détecté' });
                return;
            }
        }
        const { data: insertData, error: insertError } = await supabase
            .from('reponses')
            .insert([{ nom, prenom, email }])
            .select();
        if (insertError) throw insertError;

        // Envoi du mail de confirmation après l'enregistrement
        try {
            await transporter.sendMail({
                from: 'lescompaventhuriers@gmail.com',
                to: email,
                subject: 'Confirmation de votre inscription pour la rétro des Compa\'venthuriers',
                html: `
                    <h2 style="font-family: Raleway, Arial, sans-serif; color: #003a5d; font-size: 24px;">
                        Bonjour ${prenom},
                    </h2>

                    <p style="font-family: Raleway, Arial, sans-serif; color: #003a5d; font-size: 16px;">
                        <strong>Inscription confirmée 🎉</strong>
                        <br>
                        Merci pour votre inscription à la rétro des Compa'venthuriers !
                        <br>
                        Nous vous confirmons que votre présence est bien enregistrée, et nous avons hâte de vous retrouver 😊
                        <br><br>

                        <strong>📅 Informations pratiques</strong>
                        <br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<strong>- Date :</strong> 11 avril 2026
                        <br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<strong>- Lieu : <a href="https://maps.app.goo.gl/PeD4Mo1LaM8QyqLy9" target="_blank">CSRA à Mulhouse (5 Rue des Frères Lumière, Mulhouse)</a></strong>
                        <br>
                        &nbsp;&nbsp;&nbsp;&nbsp;<strong>- Horaire :</strong> 19h00
                        <br><br>

                        <strong>🍽️ Sur place</strong>
                        <br>
                        Nous avons prévu de quoi manger et boire sur place, 
                        mais n'hésitez pas à venir avec votre bonne humeur et votre sourire !
                        <br><br>                    
                        <strong>À très bientôt !</strong>
                        <br>
                        Les Compas'venthuriers
                    </p>
                    <img src="https://formulaire-scout.vercel.app/images/signature-mail.png" alt="Signature" style="height: 125px; width: auto;" />`,
            });
        } catch (mailErr) {
            // Optionnel : log l'erreur d'envoi de mail, mais ne bloque pas l'inscription
            console.error('Erreur lors de l\'envoi du mail :', mailErr);
        }

        res.status(200).json({ success: true, id: insertData && insertData[0] ? insertData[0].id : null });
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de l'insertion" });
    }
};
