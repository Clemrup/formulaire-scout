const nodemailer = require('nodemailer');

// Configurer le transporteur Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lescompaventhuriers@gmail.com',
        pass: 'novi cjym kpjn gpyl' // mot de passe d'application
    }
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Méthode non autorisée' });
        return;
    }

    const { emails } = req.body;

    // Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        res.status(400).json({ error: 'Liste d\'emails vide' });
        return;
    }

    // Validation des emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsValides = emails.filter(email => emailRegex.test(email));

    if (emailsValides.length === 0) {
        res.status(400).json({ error: 'Aucun email valide' });
        return;
    }

    try {
        const htmlContent = `
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
                <h2 style="color: #003a5d; font-size: 24px; margin-top: 0;">
                    Bonjour,
                </h2>
            
                <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                    <strong>🍽️ Bonne nouvelle !</strong> Un <strong>repas traditionnel réunionnais</strong> vous attend après la projection du film ! 
                    <br><br>
                    Découvrez ci-dessous les détails.
                </p>
            
                <!-- Section repas - MAIN CONTENT -->
                <div style="background-color: #fff4e6; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="color: #ff9800; margin-top: 0; font-size: 20px; text-align: center;">🍽️ Repas traditionnel réunionnais</h3>
                    <p style="color: #003a5d; margin: 10px 0; font-size: 16px; line-height: 1.6;">
                        Après la projection, nous vous offrons un <strong>délicieux repas traditionnel réunionnais</strong> pour partager ce moment ensemble !
                    </p>
                    
                    <div style="background-color: #ffe8cc; padding: 15px; border-radius: 4px; margin: 15px 0;">
                        <p style="color: #003a5d; margin: 10px 0; font-size: 16px; line-height: 1.6;">
                            Si vous <strong>ne souhaitez pas participer au repas</strong> (allergies, contraintes, autres raisons), veuillez nous le signaler au plus vite en envoyant un mail à <a href="mailto:lescompaventhuriers@gmail.com" style="color: #ff9800; font-weight: bold; text-decoration: underline;">lescompaventhuriers@gmail.com</a>.
                            <br><br>
                            Cela nous permettra d'adapter le nombre de couverts et d'optimiser l'organisation. <strong>Merci de votre réactivité !</strong>
                        </p>
                    </div>
                </div>

                <!-- Rappel des infos pratiques (secondaire) -->
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
                <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                    Nous comptons sur vous ! N'oubliez pas de nous signaler si vous ne pouvez pas participer au repas.
                    <br><br>
            
                    <strong>À très bientôt ! 🎉</strong>
                    <br><br>
            
                    <em>Les Compa'venthuriers</em>
                </p>
            
                <!-- Signature -->
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <img src="https://formulaire-scout.vercel.app/images/signature-mail.png" alt="Signature Compa'venthuriers" style="height: 100px; width: auto;" />
                </div>
            
            </div>
        `;

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Envoyer un mail à chaque email valide
        for (const email of emailsValides) {
            try {
                await transporter.sendMail({
                    from: 'lescompaventhuriers@gmail.com',
                    to: email,
                    subject: '🍽️ Un repas traditionnel réunionnais vous attend !',
                    html: htmlContent
                });
                successCount++;
            } catch (err) {
                errorCount++;
                errors.push({ email, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            successCount,
            errorCount,
            total: emailsValides.length,
            errors: errors.length > 0 ? errors : null
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'envoi des mails', details: err.message });
    }
};
