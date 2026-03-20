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
// Fonction pour charger et afficher dynamiquement les réponses
async function loadReponses() {
    const table = document.getElementById('reponsesTable');
    const msg = document.querySelector('.aucune-reponse');
    // Supprime les anciennes lignes (sauf l'en-tête)
    while (table.rows.length > 1) table.deleteRow(1);
    const res = await fetch('/api/reponses_liste');
    if (res.ok) {
        const { reponses } = await res.json();
        if (reponses && reponses.length > 0) {
            msg.style.display = 'none';
            for (const [index, rep] of reponses.entries()) {
                const tr = document.createElement('tr');
                tr.setAttribute('data-id', rep.id);
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="nom">${rep.nom}</td>
                    <td class="prenom">${rep.prenom}</td>
                    <td class="email">${rep.email || ''}</td>
                    <td>
                        <button type="button" class="edit-btn">Modifier</button>
                        <button type="button" class="delete-btn">Supprimer</button>
                    </td>
                `;
                table.appendChild(tr);
            }
        } else {
            msg.style.display = '';
        }
    } else {
        msg.style.display = '';
    }
    // Réattache les listeners après avoir généré les lignes
    attachActionListeners();
}

// Réattache les listeners sur les boutons dynamiques
function attachActionListeners() {
    Array.from(document.querySelectorAll('.delete-btn')).forEach(btn => {
        btn.onclick = async function() {
            if (!confirm('Supprimer cette réponse ?')) return;
            const tr = this.closest('tr');
            const id = tr.getAttribute('data-id');
            await fetch('/api/reponses_supprimer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            await loadReponses();
            await updateInfos();
        };
    });
    Array.from(document.querySelectorAll('.edit-btn')).forEach(btn => {
        btn.onclick = function() {
            const tr = this.closest('tr');
            const nomTd = tr.querySelector('.nom');
            const prenomTd = tr.querySelector('.prenom');
            const emailTd = tr.querySelector('.email');
            const oldNom = nomTd.textContent;
            const oldPrenom = prenomTd.textContent;
            const oldEmail = emailTd ? emailTd.textContent : '';
            const nomInput = document.createElement('input');
            nomInput.type = 'text';
            nomInput.style.boxSizing = 'border-box';
            nomInput.value = oldNom;
            nomTd.textContent = '';
            nomTd.appendChild(nomInput);
            const prenomInput = document.createElement('input');
            prenomInput.type = 'text';
            prenomInput.style.boxSizing = 'border-box';
            prenomInput.value = oldPrenom;
            prenomTd.textContent = '';
            prenomTd.appendChild(prenomInput);
            let emailInput = null;
            if (emailTd) {
                emailInput = document.createElement('input');
                emailInput.type = 'email';
                emailInput.style.boxSizing = 'border-box';
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
            cancelBtn.onclick = function() {
                nomTd.textContent = oldNom;
                prenomTd.textContent = oldPrenom;
                emailTd.textContent = oldEmail;
                btn.style.display = '';
                saveBtn.remove();
                cancelBtn.remove();
            };
            saveBtn.onclick = async function() {
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
                    await loadReponses();
                    await updateInfos();
                } else {
                    alert('Erreur lors de la modification');
                }
            };
        };
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    await updateInfos();
    await loadReponses();
});
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

// Gestion de l'export des emails uniques
const btnExportEmails = document.getElementById('btn-export-emails');
const modalEmails = document.getElementById('modal-emails');
const closeModalBtn = document.getElementById('close-modal');
const copyEmailsBtn = document.getElementById('copy-emails');
const downloadEmailsBtn = document.getElementById('download-emails');
const emailsList = document.getElementById('emails-list');
const countEmails = document.getElementById('count-emails');

if (btnExportEmails) {
    btnExportEmails.addEventListener('click', async () => {
        const res = await fetch('/api/reponses_liste');
        if (res.ok) {
            const { reponses } = await res.json();
            // Extraire les emails uniques (non vides)
            const emailsSet = new Set();
            if (reponses && reponses.length > 0) {
                reponses.forEach(rep => {
                    if (rep.email && rep.email.trim()) {
                        emailsSet.add(rep.email.trim());
                    }
                });
            }
            const emailsArray = Array.from(emailsSet).sort();
            
            // Remplir le tableau
            emailsList.innerHTML = '';
            emailsArray.forEach((email, index) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #ddd';
                tr.innerHTML = `
                    <td style="padding:10px; text-align:center;">${index + 1}</td>
                    <td style="padding:10px;">${email}</td>
                `;
                emailsList.appendChild(tr);
            });
            
            countEmails.textContent = emailsArray.length;
            
            // Stocker les emails pour la copie/téléchargement
            window.uniqueEmails = emailsArray;
            
            // Afficher le modal
            modalEmails.style.display = 'block';
        } else {
            alert('Erreur lors du chargement des réponses');
        }
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        modalEmails.style.display = 'none';
    });
}

if (copyEmailsBtn) {
    copyEmailsBtn.addEventListener('click', () => {
        if (window.uniqueEmails && window.uniqueEmails.length > 0) {
            const text = window.uniqueEmails.join('\n');
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyEmailsBtn.textContent;
                copyEmailsBtn.textContent = '✓ Copié !';
                setTimeout(() => {
                    copyEmailsBtn.textContent = originalText;
                }, 2000);
            });
        }
    });
}

if (downloadEmailsBtn) {
    downloadEmailsBtn.addEventListener('click', () => {
        if (window.uniqueEmails && window.uniqueEmails.length > 0) {
            const csv = window.uniqueEmails.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'emails_uniques.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
}

// Fermer le modal en cliquant en dehors
window.addEventListener('click', (event) => {
    if (event.target === modalEmails) {
        modalEmails.style.display = 'none';
    }
});
