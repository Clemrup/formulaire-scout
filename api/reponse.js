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
                subject: 'Confirmation de votre inscription - Rétro des Compa\'venthuriers',
                html: `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation d'inscription - Compa'venthuriers</title>
</head>
<body style="font-family: Raleway, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <h2 style="color: #003a5d; font-size: 24px; margin-top: 0;">
            Bonjour ${prenom},
        </h2>

        <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
            <strong>🎉 Votre inscription est confirmée !</strong>
            <br><br>
            Merci pour votre inscription à la rétro des Compa'venthuriers ! Nous vous confirmons que votre présence est bien enregistrée.
            <br><br>
            <strong>🍽️ Une excellente nouvelle :</strong> Un <strong>repas traditionnel réunionnais</strong> sera offert après la projection du film !
        </p>

        <!-- Informations pratiques -->
        <div style="background-color: #f0f4f8; border-left: 4px solid #2d622b; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #003a5d; margin-top: 0; font-size: 18px;">📅 Informations pratiques</h3>
            
            <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                <strong>Date :</strong> Samedi 11 avril 2026
            </p>
            <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                <strong>Horaire :</strong> 19h00
            </p>
            <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                <strong>Adresse :</strong><br>
                CSRA (Centre Sportif Régional Alsace)<br>
                5 Rue des Frères Lumière<br>
                68100 Mulhouse
            </p>
            <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                <strong>🗺️ GPS :</strong> <a href="https://maps.app.goo.gl/PeD4Mo1LaM8QyqLy9" target="_blank" rel="noopener noreferrer" style="color: #2d622b; text-decoration: underline;">Ouvrir dans Google Maps</a>
            </p>
        </div>

        <!-- Repas traditionnel réunionnais -->
        <div style="background-color: #fff4e6; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #ff9800; margin-top: 0; font-size: 20px; text-align: center;">🍽️ Repas traditionnel réunionnais</h3>
            <p style="color: #003a5d; margin: 10px 0; font-size: 16px; line-height: 1.6;">
                Après la projection, nous vous offrons un <strong>délicieux repas traditionnel réunionnais</strong> pour partager ce moment ensemble !
            </p>
            
            <div style="background-color: #ffe8cc; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p style="color: #003a5d; margin: 10px 0; font-size: 16px; line-height: 1.6;">
                    Si vous <strong>ne souhaitez pas participer au repas</strong>, veuillez nous le signaler au plus vite en envoyant un mail à <a href="mailto:lescompaventhuriers@gmail.com" style="color: #ff9800; font-weight: bold; text-decoration: underline;">lescompaventhuriers@gmail.com</a>.
                    <br><br>
                    Cela nous permettra d'adapter le nombre de couverts et d'optimiser l'organisation.
                </p>
            </div>
        </div>

        <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
            Si vous avez des questions ou des contraintes particulières, n'hésitez pas à nous contacter.
            <br><br>

            <strong>À très bientôt ! 🎊</strong>
            <br><br>

            <em>Les Compa'venthuriers</em>
        </p>

        <!-- Signature -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <img src="https://formulaire-scout.vercel.app/images/signature-mail.png" alt="Signature Compa'venthuriers" style="height: 100px; width: auto;" />
        </div>

    </div>
</body>
</html>`,
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
