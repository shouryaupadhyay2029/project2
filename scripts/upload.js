document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();

    const uploadForm = document.getElementById('project-upload-form');
    const fileInput = document.getElementById('project-file');
    const dropZone = document.getElementById('drop-zone');
    const fileLabel = document.getElementById('file-label');
    const statusMsg = document.getElementById('upload-status');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');
    const previousList = document.getElementById('previous-projects-list');

    // ─── 0. LOGO BLOOM ANIMATION ────────────────────────────
    const logoWrapper = document.querySelector('.logo-bloom-wrapper');
    if (logoWrapper) {
        setTimeout(() => {
            logoWrapper.classList.add('bloom');
            setTimeout(() => {
                logoWrapper.classList.add('is-breathing');
            }, 1700);
        }, 500);
    }

    // ─── 0.5 HAMBURGER DROPDOWN LOGIC ───────────────────────
    const hamburgerCheckbox = document.getElementById('hamburger-checkbox');
    const hamburgerDropdown = document.getElementById('hamburger-dropdown');
    const hamburgerLabel = document.getElementById('hamburger-menu-label');
    const navItems = hamburgerDropdown.querySelectorAll('.nav-item-anim');

    if (hamburgerCheckbox) {
        hamburgerCheckbox.addEventListener('change', () => {
            if (hamburgerCheckbox.checked) {
                hamburgerDropdown.classList.add('active');
                navItems.forEach(item => {
                    item.classList.remove('nav-item-visible');
                    item.style.transitionDelay = '0ms';
                });
                requestAnimationFrame(() => {
                    navItems.forEach((item, index) => {
                        item.style.transitionDelay = `${index * 35}ms`;
                        item.classList.add('nav-item-visible');
                    });
                });
            } else {
                hamburgerDropdown.classList.remove('active');
                navItems.forEach(item => {
                    item.classList.remove('nav-item-visible');
                    item.style.transitionDelay = '0ms';
                });
            }
        });

        // Highlight follow mouse
        hamburgerDropdown.addEventListener('mousemove', (e) => {
            const rect = hamburgerDropdown.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            hamburgerDropdown.style.setProperty('--mouse-x', `${x}%`);
            hamburgerDropdown.style.setProperty('--mouse-y', `${y}%`);
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!hamburgerLabel.contains(e.target) && hamburgerCheckbox.checked) {
                hamburgerCheckbox.checked = false;
                hamburgerDropdown.classList.remove('active');
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && hamburgerCheckbox.checked) {
                hamburgerCheckbox.checked = false;
                hamburgerDropdown.classList.remove('active');
            }
        });
    }

    // ─── 1. AUTH CHECK & INITIAL FETCH ────────────────────────
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchPreviousUploads(user.uid);
        } else {
            window.location.href = '../index.html?action=login';
        }
    });

    async function fetchPreviousUploads(uid) {
        const snap = await db.collection('projects')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        previousList.innerHTML = '';
        if (snap.empty) {
            previousList.innerHTML = '<p class="empty-msg">No projects shared yet.</p>';
            return;
        }

        snap.forEach(doc => {
            const p = doc.data();
            const date = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : 'Just now';
            const item = document.createElement('div');
            item.className = 'mini-upload-item';
            item.innerHTML = `
                <img src="${p.fileURL}" class="mini-thumb" alt="${p.title}">
                <div class="mini-info">
                    <h5>${p.title}</h5>
                    <p>Shared on ${date}</p>
                </div>
            `;
            previousList.appendChild(item);
        });
    }

    // ─── 2. DRAG & DROP LOGIC ────────────────────────────────
    const previewImg = document.getElementById('preview-img');
    const previewPlaceholderUI = document.getElementById('preview-placeholder-ui');
    const previewOverlay = document.getElementById('preview-empty-overlay');
    const previewTitle = document.getElementById('preview-title');
    const previewDesc = document.getElementById('preview-desc');
    const previewTech = document.getElementById('preview-tech-stack');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            fileLabel.innerText = `Selected: ${file.name}`;
            dropZone.classList.add('active');
            updateTerminalStatus(`payload attached: ${file.name}`);

            // Live Preview Thumbnail
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = 'block';
                previewPlaceholderUI.style.display = 'none';
                revealPreview();
            };
            reader.readAsDataURL(file);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            fileLabel.innerText = `Dropped: ${file.name}`;
            updateTerminalStatus(`payload dropped: ${file.name}`);

            // Live Preview Thumbnail
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = 'block';
                previewPlaceholderUI.style.display = 'none';
                revealPreview();
            };
            reader.readAsDataURL(file);
        }
    });

    // ─── 2.5 TERMINAL CARD INTERACTIONS ───────────────────────
    const terminalCard = document.getElementById('terminal-card-container');
    const terminalGlow = document.getElementById('terminal-cursor-glow');
    const terminalStatusText = document.getElementById('terminal-live-status');
    const previewCard = document.getElementById('project-preview-card');

    if (terminalCard && terminalGlow) {
        terminalCard.addEventListener('mousemove', (e) => {
            const rect = terminalCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Update glow position
            terminalGlow.style.left = `${x}px`;
            terminalGlow.style.top = `${y}px`;

            // Perspective Tilt
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = (y - centerY) / 35;
            const tiltY = (centerX - x) / 35;

            terminalCard.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        });

        terminalCard.addEventListener('mouseleave', () => {
            terminalCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        });
    }

    // Preview Card Tilt
    if (previewCard) {
        previewCard.addEventListener('mousemove', (e) => {
            const rect = previewCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            previewCard.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
            previewCard.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = (y - centerY) / 25;
            const tiltY = (centerX - x) / 25;

            previewCard.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        });

        previewCard.addEventListener('mouseleave', () => {
            previewCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        });
    }

    // Tech Chips & Live Sync
    const titleInput = document.getElementById('project-title');
    const descInput = document.getElementById('project-desc');
    const techInput = document.getElementById('project-tech');
    const techChipsContainer = document.getElementById('tech-chips');
    const categoryInput = document.getElementById('project-category');
    const categoryPills = document.querySelectorAll('.category-pill');

    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            categoryInput.value = pill.dataset.category;
            updateTerminalStatus(`category updated: ${pill.dataset.category}`);
        });
    });

    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            previewTitle.innerText = e.target.value || "Project Title";
            revealPreview();
        });
    }

    if (descInput) {
        descInput.addEventListener('input', (e) => {
            previewDesc.innerText = e.target.value || "Description will appear here as you type...";
            revealPreview();
        });
    }

    if (techInput && techChipsContainer) {
        techInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const tags = value.split(',').map(t => t.trim()).filter(t => t);

            // Terminal chips
            techChipsContainer.innerHTML = tags.map(tag => `<span class="tech-chip">[ ${tag} ]</span>`).join('');

            // Preview chips
            previewTech.innerHTML = tags.map(tag => `<span class="preview-tech-chip">${tag}</span>`).join('');

            revealPreview();
        });
    }

    function revealPreview() {
        if (previewOverlay) {
            previewOverlay.classList.add('hidden');
        }
    }

    function updateTerminalStatus(text) {
        if (terminalStatusText) {
            terminalStatusText.innerText = text;
        }
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ─── 3. UPLOAD HANDLER ───────────────────────────────────
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const file = fileInput.files[0];
        const title = document.getElementById('project-title').value;
        const desc = document.getElementById('project-desc').value;
        const tech = document.getElementById('project-tech').value;
        const category = categoryInput.value;

        if (!file || !user) {
            updateTerminalStatus("error: missing payload or authentication");
            return;
        }

        // Deployment Sequence
        const submitBtn = document.getElementById('upload-submit-btn');
        submitBtn.disabled = true;

        updateTerminalStatus("initializing payload...");
        await sleep(800);
        updateTerminalStatus("compressing assets...");
        await sleep(1000);
        updateTerminalStatus("validating metadata...");
        await sleep(800);
        updateTerminalStatus("pushing to discovery...");
        await sleep(600);

        // Reset UI for actual upload
        statusMsg.style.display = 'block';
        statusMsg.innerText = "Starting secure upload...";
        statusMsg.className = "auth-message info";
        progressContainer.style.display = 'block';

        try {
            // A. Upload to Storage
            updateTerminalStatus("optimizing assets & pushing to storage...");
            const storageRef = storage.ref(`projects/${user.uid}/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snap) => {
                    const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
                    progressBar.style.width = progress + '%';
                    progressText.innerText = `${Math.round(progress)}% Transferred`;
                    if (progress > 90) updateTerminalStatus("finalizing cloud handshake...");
                },
                (err) => { throw err; },
                async () => {
                    // B. Save to Firestore
                    updateTerminalStatus("writing to decentralized ledger...");
                    const fileURL = await uploadTask.snapshot.ref.getDownloadURL();
                    const projectDoc = await db.collection('projects').add({
                        title,
                        description: desc,
                        category,
                        techStack: tech.split(',').map(s => s.trim()).filter(s => s),
                        userId: user.uid,
                        userName: user.displayName || 'Developer',
                        userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
                        fileURL,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        likesCount: 0,
                        viewCount: 0
                    });

                    // C. Log Activity
                    updateTerminalStatus("logging event to activity stream...");
                    await db.collection('activity').add({
                        type: 'upload',
                        userId: user.uid,
                        userName: user.displayName || 'Developer',
                        userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
                        projectId: projectDoc.id,
                        projectTitle: title,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // D. Finalize
                    updateTerminalStatus("deployment successful. system nominal.");
                    statusMsg.innerText = "Project shared successfully!";
                    statusMsg.className = "auth-message success";
                    const badge = document.querySelector('.status-badge');
                    if (badge) {
                        badge.innerText = "DONE";
                        badge.style.borderColor = "#00ff88";
                        badge.style.color = "#00ff88";
                    }
                    setTimeout(() => window.location.href = 'explore.html', 1500);
                }
            );
        } catch (err) {
            console.error(err);
            updateTerminalStatus("critical error: upload execution failed");
            statusMsg.innerText = "Upload failed. Please try again.";
            statusMsg.className = "auth-message error";
            submitBtn.disabled = false;
        }
    });
});
