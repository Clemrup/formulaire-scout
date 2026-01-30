// Script séparé pour la page d'administration des réponses
async function updateInfos() {
    const res = await fetch('/api/places_restantes');
    if (res.ok) {
        const data = await res.json();
        let nbReponsesElem = document.querySelector('.nb-reponses');
        let capaciteElem = document.querySelector('.capacite');
        if (nbReponsesElem) {
            nbReponsesElem.textContent = data.nb_reponses;
        }
        if (capaciteElem) {
            capaciteElem.textContent = data.capacite;
            // Met à jour la valeur de l'input capacité
            const capInput = document.getElementById('capacite');
            if (capInput) capInput.value = data.capacite;
        }
        const table = document.getElementById('reponsesTable');
        const msg = document.querySelector('.aucune-reponse');
        if (table && table.rows.length === 1) {
            msg.style.display = '';
        } else {
            msg.style.display = 'none';
        }
        const alert = document.getElementById('alert-limite');
        if (data.places_restantes === 0) {
            alert.style.display = 'block';
        } else {
            alert.style.display = 'none';
        }
    }
}
window.addEventListener('DOMContentLoaded', updateInfos);
// Suppression
Array.from(document.querySelectorAll('.delete-btn')).forEach(btn => {
    btn.addEventListener('click', async function() {
        if (!confirm('Supprimer cette réponse ?')) return;
        const tr = this.closest('tr');
        const id = tr.getAttribute('data-id');
        await fetch('/api/reponses_supprimer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        tr.remove();
        await updateInfos();
    });
});
// Edition
Array.from(document.querySelectorAll('.edit-btn')).forEach(btn => {
    btn.addEventListener('click', function() {
        const tr = this.closest('tr');
        const nomTd = tr.querySelector('.nom');
        const prenomTd = tr.querySelector('.prenom');
        const emailTd = tr.querySelector('.email');
        const oldNom = nomTd.textContent;
        const oldPrenom = prenomTd.textContent;
        const oldEmail = emailTd ? emailTd.textContent : '';
        const nomInput = document.createElement('input');
        nomInput.type = 'text';
        nomInput.value = oldNom;
        nomTd.textContent = '';
        nomTd.appendChild(nomInput);
        const prenomInput = document.createElement('input');
        prenomInput.type = 'text';
        prenomInput.value = oldPrenom;
        prenomTd.textContent = '';
        prenomTd.appendChild(prenomInput);
        let emailInput = null;
        if (emailTd) {
            emailInput = document.createElement('input');
            emailInput.type = 'email';
            emailInput.value = oldEmail;
            emailTd.textContent = '';
            emailTd.appendChild(emailInput);
        }
        this.style.display = 'none';
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Enregistrer';
        saveBtn.className = 'save-btn';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Annuler';
        cancelBtn.className = 'cancel-btn';
        this.parentNode.appendChild(saveBtn);
        this.parentNode.appendChild(cancelBtn);
        cancelBtn.addEventListener('click', function() {
            nomTd.textContent = oldNom;
            prenomTd.textContent = oldPrenom;
            btn.style.display = '';
            saveBtn.remove();
            cancelBtn.remove();
        });
        saveBtn.addEventListener('click', async function() {
            const newNom = nomTd.querySelector('input').value;
            const newPrenom = prenomTd.querySelector('input').value;
            const newEmail = emailTd ? (emailTd.querySelector('input') ? emailTd.querySelector('input').value : '') : '';
            const id = tr.getAttribute('data-id');
            const payload = { id, nom: newNom, prenom: newPrenom, email: newEmail };
            const res = await fetch('/api/reponses_modifier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                nomTd.textContent = newNom;
                prenomTd.textContent = newPrenom;
                emailTd.textContent = newEmail;
                btn.style.display = '';
                saveBtn.remove();
                cancelBtn.remove();
                await updateInfos();
            } else {
                alert('Erreur lors de la modification');
            }
        });
    });
});
// Toggle capacity input visibility
const toggleBtn = document.getElementById('toggle-capacite');
const capaciteControls = document.getElementById('capacite-controls');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        if (!capaciteControls) return;
        const isHidden = getComputedStyle(capaciteControls).display === 'none';
        capaciteControls.style.display = isHidden ? 'inline-block' : 'none';
        if (isHidden) {
            const capInput = document.getElementById('capacite');
            if (capInput) { setTimeout(() => capInput.focus(), 50); }
        }
    });
}

// Gestion du bouton "Enregistrer" pour la capacité
const saveCapaciteBtn = capaciteControls ? capaciteControls.querySelector('button[type="button"]') : null;
if (saveCapaciteBtn) {
    saveCapaciteBtn.addEventListener('click', async () => {
        const capInput = document.getElementById('capacite');
        if (!capInput) return;
        const nouvelleCapacite = parseInt(capInput.value, 10);
        if (isNaN(nouvelleCapacite) || nouvelleCapacite < 1) {
            alert('Veuillez entrer une capacité valide.');
            return;
        }
        const res = await fetch('/api/capacite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ capacite: nouvelleCapacite })
        });
        if (res.ok) {
            await updateInfos();
            capaciteControls.style.display = 'none';
        } else {
            alert('Erreur lors de la mise à jour de la capacité.');
        }
    });
}
