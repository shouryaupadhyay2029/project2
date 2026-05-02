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

    // ─── 1. AUTH CHECK & INITIAL FETCH ────────────────────────
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchPreviousUploads(user.uid);
        } else {
            window.location.href = 'index.html?action=login';
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
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            fileLabel.innerText = `Selected: ${e.target.files[0].name}`;
            dropZone.classList.add('active');
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
            fileInput.files = e.dataTransfer.files;
            fileLabel.innerText = `Dropped: ${e.dataTransfer.files[0].name}`;
        }
    });

    // ─── 3. UPLOAD HANDLER ───────────────────────────────────
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const file = fileInput.files[0];
        const title = document.getElementById('project-title').value;
        const desc = document.getElementById('project-desc').value;
        const tech = document.getElementById('project-tech').value;

        if (!file || !user) return;

        // Reset UI
        statusMsg.style.display = 'block';
        statusMsg.innerText = "Starting secure upload...";
        statusMsg.className = "auth-message info";
        progressContainer.style.display = 'block';
        const submitBtn = document.getElementById('upload-submit-btn');
        submitBtn.disabled = true;

        try {
            // A. Upload to Storage
            const storageRef = storage.ref(`projects/${user.uid}/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed', 
                (snap) => {
                    const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
                    progressBar.style.width = progress + '%';
                    progressText.innerText = `${Math.round(progress)}% Complete`;
                },
                (err) => { throw err; },
                async () => {
                    // B. Save to Firestore
                    const fileURL = await uploadTask.snapshot.ref.getDownloadURL();
                    const projectDoc = await db.collection('projects').add({
                        title,
                        description: desc,
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
                    statusMsg.innerText = "Project shared successfully!";
                    statusMsg.className = "auth-message success";
                    setTimeout(() => window.location.href = 'explore.html', 1500);
                }
            );
        } catch (err) {
            console.error(err);
            statusMsg.innerText = "Upload failed. Please try again.";
            statusMsg.className = "auth-message error";
            submitBtn.disabled = false;
        }
    });
});
