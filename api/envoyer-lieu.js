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
                    <strong>📍 Le lieu de la rétro est confirmé !</strong>
                    <br><br>
                    Nous avons le plaisir de vous confirmer que la rétro des Compa'venthuriers aura lieu au <strong>CSRA à Mulhouse</strong>. 
                    <br>
                    Voici tous les détails pour vous rendre sur place :
                </p>
            
                <!-- Informations pratiques -->
                <div style="background-color: #f0f4f8; border-left: 4px solid #2d622b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                        <strong>📅 Date :</strong> Samedi 11 avril 2026
                    </p>
                    <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                        <strong>🕖 Horaire :</strong> 19h00
                    </p>
                    <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                        <strong>📍 Adresse :</strong><br>
                        CSRA (Centre Sportif Régional Alsace)<br>
                        5 Rue des Frères Lumière<br>
                        68100 Mulhouse
                    </p>
                    <p style="color: #003a5d; margin: 10px 0; font-size: 16px;">
                        <strong>🗺️ GPS :</strong> <a href="https://maps.app.goo.gl/PeD4Mo1LaM8QyqLy9" target="_blank" rel="noopener noreferrer" style="color: #2d622b; text-decoration: underline;">Ouvrir dans Google Maps</a>
                    </p>
                </div>
            
                <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                    N'hésitez pas à nous contacter si vous avez besoin de précisions ou si vous avez des contraintes particulières.
                    <br><br>
            
                    <strong>Nous avons hâte de vous retrouver ! À très bientôt ! 🎉</strong>
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
                    subject: 'Le lieu de la rétro des Compa\'venthuriers 📍',
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
