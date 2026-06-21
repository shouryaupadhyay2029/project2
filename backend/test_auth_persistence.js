const jwt = require('jsonwebtoken');

const BACKEND_URL = 'http://localhost:5000';
const JWT_ACCESS_SECRET = 'shourya_PlaceProProject'; // from .env

const runTest = async () => {
    console.log('=== Starting Auth Persistence & Settings Validation ===\n');

    const email = `test.user.${Date.now()}@example.com`;
    const username = `testuser_${Date.now()}`;
    const password = 'testpassword123';

    // 1. SIGNUP SUCCESS
    console.log('1. Testing Signup...');
    const registerRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const registerData = await registerRes.json();
    if (!registerData.success) {
        throw new Error(`Signup failed: ${JSON.stringify(registerData)}`);
    }
    console.log('   [PASS] Signup success! User created:', registerData.user.username);

    // 2. LOGIN SUCCESS
    console.log('\n2. Testing Manual Login...');
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    const localToken = loginData.token;
    console.log('   [PASS] Login success! Token acquired.');

    // 3. REFRESH / ME SUCCESS
    console.log('\n3. Testing Refresh / Me (Protected Route)...');
    const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localToken}` }
    });
    const meData = await meRes.json();
    if (!meData.success) {
        throw new Error(`Me request failed: ${JSON.stringify(meData)}`);
    }
    console.log('   [PASS] Refresh success! User info verified:', meData.user.email);

    // 4. PROFILE SAVE SUCCESS (using protect middleware)
    console.log('\n4. Testing Profile Save (using protect middleware)...');
    const updateProfileRes = await fetch(`${BACKEND_URL}/api/users/update-profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localToken}`
        },
        body: JSON.stringify({ displayName: 'Verified User', bio: 'Living the developer life' })
    });
    const updateProfileData = await updateProfileRes.json();
    if (!updateProfileData.success) {
        throw new Error(`Profile update failed: ${JSON.stringify(updateProfileData)}`);
    }
    console.log('   [PASS] Profile save success! Updated displayName:', updateProfileData.user.displayName);

    // 5. SETTINGS SAVE SUCCESS (using protect middleware)
    console.log('\n5. Testing Platform Settings Save (using protect middleware)...');
    const updateSettingsRes = await fetch(`${BACKEND_URL}/api/settings/appearance`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localToken}`
        },
        body: JSON.stringify({
            theme: 'dark',
            compactMode: true
        })
    });
    const updateSettingsData = await updateSettingsRes.json();
    if (!updateSettingsData.success) {
        throw new Error(`Platform settings update failed: ${JSON.stringify(updateSettingsData)}`);
    }
    console.log('   [PASS] Platform settings save success! Compact mode enabled:', updateSettingsData.settings.appearance.compactMode);

    // 6. GOOGLE / FIREBASE TOKEN EMULATION
    console.log('\n6. Testing Google / Firebase Token Emulation...');
    // Sign a token with standard JWT_ACCESS_SECRET containing provider: 'google' to verify Google provider flag
    const googleMockToken = jwt.sign({
        id: registerData.user.id || registerData.user._id,
        email: email,
        provider: 'google'
    }, JWT_ACCESS_SECRET);

    console.log('   Sending request to update-profile with emulated Google token...');
    const googleProfileRes = await fetch(`${BACKEND_URL}/api/users/update-profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleMockToken}`
        },
        body: JSON.stringify({ displayName: 'Google Sync User', bio: 'Authenticated via Google!' })
    });
    const googleProfileData = await googleProfileRes.json();
    if (!googleProfileData.success) {
        throw new Error(`Google profile update failed: ${JSON.stringify(googleProfileData)}`);
    }
    console.log('   [PASS] Google user sync & update success! User:', googleProfileData.user.username);

    // 7. RE-LOGIN SUCCESS
    console.log('\n7. Testing Re-login Success...');
    const reloginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const reloginData = await reloginRes.json();
    if (!reloginData.success) {
        throw new Error(`Re-login failed: ${JSON.stringify(reloginData)}`);
    }
    console.log('   [PASS] Re-login successful with same credentials.');

    console.log('\n=== All Authentication and Persistence Checks Passed Successfully! ===');
};

runTest().catch(err => {
    console.error('\n[FAIL] Validation Failed:', err.message);
    process.exit(1);
});
