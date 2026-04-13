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
                Bonjour à toutes et à tous,
            </h2>
        
            <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                Nous souhaitions vous remercier sincèrement pour votre présence lors de notre rétrospective de camp compagnon T2 samedi dernier.
            </p>

            <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                Nous espérons que ça vu a plu et que vous avez passé un bon moment à nos côtés, à revivre avec nous cette belle aventure vécue à La Réunion, que ce moment de partage vous a permis de découvrir (ou redécouvrir) notre expérience, nos actions sur place, ainsi que tous les souvenirs que nous en gardons.
            </p>
            
            <!-- Section vidéo -->
            <div style="background-color: #f0f4f8; border-left: 4px solid #2d622b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #003a5d; margin-top: 0; font-size: 18px;">🎬 Revoir le film</h3>
                <p style="color: #003a5d; margin: 10px 0; font-size: 16px; line-height: 1.6;">
                    Si vous souhaitez revoir le film chez vous, vous pouvez le consulter en cliquant sur le lien ci-dessous :
                </p>
                <p style="text-align: center; margin: 15px 0;">
                    <a href="https://youtu.be/7sFJDjPI9UU?si=K26WE3P1Rs1sOzu2" target="_blank" rel="noopener noreferrer" style="background-color: #2d622b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Regarder le film</a>
                </p>
            </div>

            <p style="color: #003a5d; font-size: 16px; line-height: 1.6;">
                Encore un grand merci à chacun d'entre vous pour votre venue et votre intérêt !
                <br><br>
                <strong>À très bientôt,</strong>
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
                    subject: 'Merci pour votre présence à notre rétrospective ! 🎬',
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
