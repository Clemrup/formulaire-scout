// Script séparé pour le formulaire et l'accès admin
const formEl = document.getElementById('formulaire');
if (formEl) {
    formEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nom = document.getElementById('nom').value;
        const prenom = document.getElementById('prenom').value;
        const email = document.getElementById('email') ? document.getElementById('email').value : '';
        const response = await fetch('/api/reponse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, prenom, email })
        });
        const successMsg = document.getElementById('successMsg');
        const errorMsg = document.getElementById('errorMsg');
        if (response.ok) {
            if (errorMsg) { errorMsg.style.display = 'none'; errorMsg.textContent = ''; }
            if (successMsg) successMsg.style.display = 'block';
            formEl.reset();
            // Remplace dynamiquement le nombre de places restantes sans dupliquer
            const placesDiv = document.querySelector('.places-restantes');
            const res = await fetch('/api/places_restantes');
            if (res.ok) {
                const data = await res.json();
                if (placesDiv) placesDiv.textContent = `Places restantes : ${data.places_restantes} / ${data.capacite}`;
                if (data.places_restantes === 0) {
                    formEl.style.display = 'none';
                    let oldAlert = document.getElementById('alert-capacite');
                    if (!oldAlert) {
                        const alert = document.createElement('div');
                        alert.id = 'alert-capacite';
                        alert.style.color = 'red';
                        alert.style.fontWeight = 'bold';
                        alert.textContent = "⚠️ La capacité maximale est atteinte, il n'est plus possible de s'inscrire.";
                        document.querySelector('.container').appendChild(alert);
                    }
                }
            }
        } else if (response.status === 409) {
            // Duplicate detected
            if (successMsg) successMsg.style.display = 'none';
            if (errorMsg) { errorMsg.textContent = 'Vous êtes déjà inscrit (doublon détecté).'; errorMsg.style.display = 'block'; }
        } else {
            if (successMsg) successMsg.style.display = 'none';
            if (errorMsg) { errorMsg.textContent = 'Erreur lors de l\'envoi. Veuillez réessayer.'; errorMsg.style.display = 'block'; }
        }
    });
}
// Ajout du bouton admin (simple prompt)
const adminBtn = document.getElementById('admin-btn');
if (adminBtn) {
    adminBtn.addEventListener('click', function() {
        const pwd = prompt('Mot de passe admin :');
        if (pwd === 'Compa2023.') {
            window.location.href = '/reponses';
        } else if (pwd !== null) {
            alert('Mot de passe incorrect.');
        }
    });
}
